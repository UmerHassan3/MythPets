// Server-only: reads request headers and Upstash credentials.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { headers } from "next/headers";

/**
 * Request rate limiting, backed by Upstash Redis.
 *
 * Redis rather than memory because the limit has to hold across instances: on
 * Vercel every concurrent lambda is its own process, so an in-memory counter
 * would give an attacker one full allowance per instance.
 */

/** Ten attempts per minute, per client, per action. */
const LIMIT = 10;
const WINDOW = "60 s" as const;

const isConfigured = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN,
);

const redis = isConfigured ? Redis.fromEnv() : null;

/**
 * One limiter per action, built lazily and reused.
 *
 * Separate prefixes mean a burst of sign-in attempts cannot exhaust somebody's
 * ability to register, and vice versa — they are different actions with
 * different abuse patterns.
 */
const limiters = new Map<string, Ratelimit>();

const limiterFor = (action: string): Ratelimit | null => {
  if (!redis) return null;

  const existing = limiters.get(action);
  if (existing) return existing;

  const limiter = new Ratelimit({
    redis,
    // Sliding rather than fixed: a fixed window lets someone send the full
    // allowance at the end of one window and again at the start of the next,
    // which is twice the intended rate.
    limiter: Ratelimit.slidingWindow(LIMIT, WINDOW),
    prefix: `mythpets:rl:${action}`,
    // Remembers already-blocked identifiers in this instance's memory, so a
    // client hammering the endpoint stops costing a Redis round-trip each time.
    ephemeralCache: new Map(),
    analytics: false,
  });

  limiters.set(action, limiter);
  return limiter;
};

/**
 * Best-effort client address.
 *
 * `x-forwarded-for` is client-supplied and trivially spoofed when nothing
 * rewrites it, so the headers a proxy sets itself are preferred. Vercel sets
 * `x-vercel-forwarded-for`, and takes the leftmost entry of `x-forwarded-for`
 * as the real client, which is the order used here.
 */
const clientIdentifier = async (): Promise<string> => {
  const list = await headers();

  const candidate =
    list.get("x-vercel-forwarded-for") ??
    list.get("x-real-ip") ??
    list.get("x-forwarded-for")?.split(",")[0];

  // Local development sends no forwarding headers, so everything shares one
  // bucket. That is correct for a single developer and harmless in production,
  // where the headers are always present.
  return candidate?.trim() || "local";
};

export type LimitResult =
  | { allowed: true }
  | { allowed: false; retryAfter: number };

/**
 * Consumes one token for `action` from the caller's allowance.
 *
 * Fails **open**. If Redis is unreachable, sign-in and registration keep
 * working rather than locking every customer out of the site over an outage in
 * a service that is only there to slow abuse down. The failure is logged so it
 * does not pass unnoticed.
 */
export const rateLimit = async (action: string): Promise<LimitResult> => {
  const limiter = limiterFor(action);

  if (!limiter) {
    console.warn(`[rate-limit] Upstash not configured — "${action}" unlimited`);
    return { allowed: true };
  }

  try {
    const { success, reset } = await limiter.limit(await clientIdentifier());

    if (success) return { allowed: true };

    return {
      allowed: false,
      // `reset` is an epoch in ms; the caller wants whole seconds to wait.
      retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)),
    };
  } catch (error) {
    console.error(`[rate-limit] check failed for "${action}":`, error);
    return { allowed: true };
  }
};

/** Wording shared by every limited action, so the message stays consistent. */
export const tooManyRequests = (retryAfter: number) => ({
  success: false as const,
  message:
    retryAfter > 60
      ? "Too many attempts. Please try again in a few minutes."
      : `Too many attempts. Please try again in ${retryAfter} second${retryAfter === 1 ? "" : "s"}.`,
});
