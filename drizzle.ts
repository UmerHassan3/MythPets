import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

// Reuse the pool across dev HMR reloads so we don't leak connections.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL!,
    // Fail fast instead of hanging a request forever when the link stalls.
    connectionTimeoutMillis: 15_000,
    // Opening a connection costs a TLS handshake, which is by far the most
    // expensive thing we do — keep idle connections around for a long time so
    // page loads reuse a warm one instead of paying it again. `keepAlive`
    // detects sockets the server dropped, and `withRetry` covers a stale one
    // slipping through.
    idleTimeoutMillis: 5 * 60_000,
    keepAlive: true,
    max: 5,
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
