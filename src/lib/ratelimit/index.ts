import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/redis";
import { rateLimitPrefix } from "@/lib/cache/keys";

/**
 * Upstash sliding-window rate limiting. Keeps limiter traffic OFF Postgres (the
 * old `check_rate_limit` RPC turned every request into a DB write, which is
 * backwards under load). When Redis is not configured this degrades to an
 * in-memory sliding window per instance - weaker, but never blocks a request
 * path and works in dev/preview.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

const limiters = new Map<string, Ratelimit>();

function getLimiter(name: string, limit: number, windowSeconds: number): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  const cacheKey = `${name}:${limit}:${windowSeconds}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `${rateLimitPrefix}:${name}`,
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// In-memory fallback sliding window (per instance). Good enough for dev and a
// second line of defence; not authoritative across instances.
const memoryHits = new Map<string, number[]>();

function memoryLimit(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  hits.push(now);
  memoryHits.set(key, hits);
  const remaining = Math.max(0, limit - hits.length);
  return {
    success: hits.length <= limit,
    limit,
    remaining,
    reset: now + windowMs,
  };
}

export async function rateLimit(
  name: string,
  identifier: string,
  opts: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const limiter = getLimiter(name, opts.limit, opts.windowSeconds);
  if (!limiter) {
    return memoryLimit(`${name}:${identifier}`, opts.limit, opts.windowSeconds);
  }

  try {
    const res = await limiter.limit(identifier);
    return { success: res.success, limit: res.limit, remaining: res.remaining, reset: res.reset };
  } catch {
    // If Upstash is unreachable, fail open rather than lock everyone out.
    return { success: true, limit: opts.limit, remaining: opts.limit, reset: Date.now() };
  }
}

/** Rate-limit headers for a response (RFC-style). */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
  };
}
