import "server-only";

import { getRedis } from "@/lib/redis";

/**
 * Two-tier cache. L1 is a per-instance in-memory map (smooths bursts inside a
 * warm serverless instance); L2 is Upstash Redis, shared across all instances
 * so a cold start still hits a warm value. When Redis is not configured the
 * cache silently runs L1-only, so behaviour degrades to today's per-instance
 * caching rather than breaking.
 *
 * TTLs are seconds (Redis native unit).
 */

interface L1Entry {
  value: unknown;
  expiresAt: number;
}

const l1 = new Map<string, L1Entry>();

function l1Get<T>(key: string): T | undefined {
  const hit = l1.get(key);
  if (!hit) return undefined;
  if (hit.expiresAt <= Date.now()) {
    l1.delete(key);
    return undefined;
  }
  return hit.value as T;
}

function l1Set(key: string, value: unknown, ttlSeconds: number): void {
  l1.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const local = l1Get<T>(key);
  if (local !== undefined) return local;

  const redis = getRedis();
  if (!redis) return null;

  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
  l1Set(key, value, ttlSeconds);

  const redis = getRedis();
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Cache write failures are non-fatal; L1 already holds the value.
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  for (const key of keys) l1.delete(key);

  const redis = getRedis();
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch {
    // Non-fatal.
  }
}

/**
 * Return a cached value or compute + store it. A thrown `fn` is not cached, so a
 * transient upstream failure never poisons the entry.
 */
export async function withCache<T>(
  key: string,
  ttlSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;

  const value = await fn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

/** Test-only: clear the in-memory tier. */
export function clearL1(): void {
  l1.clear();
}
