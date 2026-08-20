import "server-only";

import { Redis } from "@upstash/redis";

/**
 * Shared Upstash Redis client. Returns null when the env is not configured so
 * every caller can degrade gracefully (in-memory fallback for cache/ratelimit,
 * no-op for idempotency) rather than throwing. This lets the code merge and run
 * in dev/preview before the Upstash account exists, then light up once the two
 * REST env vars are present in Vercel.
 */

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export function isRedisConfigured(): boolean {
  return getRedis() !== null;
}
