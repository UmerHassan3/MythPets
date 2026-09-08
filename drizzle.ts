import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Reuse the pool across dev HMR reloads so we don't leak connections.
const globalForDb = globalThis as unknown as { pool?: Pool };

/**
 * Serverless and a long-running dev server want opposite pool settings.
 *
 * On Vercel every concurrent lambda instance holds its own pool, so a large
 * `max` plus a long idle timeout multiplies across instances. Locally there is
 * exactly one process, and a TLS handshake is expensive, so keeping
 * connections warm is the win.
 *
 * DATABASE_URL must point at Supabase's *transaction* pooler (port 6543). The
 * session pooler on 5432 dedicates a backend to each client for the life of
 * the connection and caps out at 15 — which a dev server, a build's workers
 * and a stray script will exhaust between them, and every query then fails
 * with EMAXCONNSESSION.
 */
const isServerless = process.env.NODE_ENV === "production";

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL!,
    // Fail fast instead of hanging a request forever when the link stalls.
    connectionTimeoutMillis: 15_000,
    keepAlive: true,

    // Enough for the parallel queries inside a single request (pages use
    // Promise.all), but small enough that concurrent instances do not add up
    // to the pooler's ceiling.
    max: isServerless ? 3 : 5,

    // Release quickly in serverless: the instance is frozen between requests
    // and would otherwise sit holding connections nobody can use. Locally,
    // hold them so page loads reuse a warm socket.
    idleTimeoutMillis: isServerless ? 10_000 : 5 * 60_000,

    // Lets the pool drain so a finished lambda does not keep the event loop
    // (and its connections) alive.
    allowExitOnIdle: isServerless,
  });

// A pool emits 'error' for idle clients dropped by the server. Without a
// listener Node treats it as an unhandled error and crashes the process.
pool.on('error', (err) => {
  console.error('[db] idle client error:', err.message);
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pool = pool;
}

export const db = drizzle({ client: pool });

/** Transport-level failures worth retrying — the query itself was never run. */
const RETRYABLE = new Set([
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNREFUSED',
  '08006', // connection_failure
  '08P01', // protocol_violation (corrupted stream)
  '57P01', // admin_shutdown
]);

/**
 * Drizzle wraps driver failures in a `DrizzleQueryError` whose own message is
 * just "Failed query: ..." — the useful code sits on `.cause`, so walk the
 * chain rather than inspecting only the outermost error.
 */
const isRetryable = (error: unknown) => {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    const { code, message } = current as { code?: string; message?: string };

    if (code && RETRYABLE.has(code)) return true;

    // Supabase's pooler rejects with a generic XX000 and the detail only in the
    // message. This is transient — a moment later a slot frees up — so it is
    // worth one backed-off retry rather than failing the page render.
    if (message && /EMAXCONN|max clients reached/i.test(message)) return true;

    if (message && /timeout|terminated|ECONNRESET|socket|connection/i.test(message)) {
      return true;
    }

    current = (current as { cause?: unknown }).cause;
  }

  return false;
};

/**
 * Retries a query through transient connection failures.
 *
 * Wrap reads and idempotent writes only — a retried INSERT can duplicate a row
 * if the first attempt actually reached the server before the socket died.
 */
export const withRetry = async <T>(
  run: () => Promise<T>,
  attempts = 3,
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !isRetryable(error)) {
        throw error;
      }

      // 250ms, 500ms — brief, since the caller is a blocking request.
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
};
