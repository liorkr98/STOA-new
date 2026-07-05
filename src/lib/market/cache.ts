/**
 * Cache helpers for the market layer. TTL by data class (docs/DATA_STACK.md
 * section 6) so we respect provider rate limits and never recompute what hasn't
 * changed. In-memory + per-instance by design: it smooths bursts within a warm
 * server instance; durable reader-facing values are cached in node attributes
 * at publish (invariant #2), not here.
 *
 * Server-only in practice (providers read server env), but pure enough to import
 * anywhere.
 */

/** TTLs in milliseconds, keyed by data class. */
export const TTL = {
  quote: 15_000,
  intraday: 60_000,
  daily: 60 * 60_000,
  fundamentals: 24 * 60 * 60_000,
  filing: 24 * 60 * 60_000,
  screener: 60 * 60_000,
  cikMap: 7 * 24 * 60 * 60_000,
} as const;

interface Entry<T> {
  value: T;
  expires: number;
}

const store = new Map<string, Entry<unknown>>();

/** Milliseconds since epoch. Isolated so callers don't sprinkle Date.now(). */
function now(): number {
  return Date.now();
}

/**
 * Return a cached value or compute + store it. A rejected `fn` is not cached, so
 * a transient provider failure doesn't poison the entry.
 */
export async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && hit.expires > now()) {
    return hit.value as T;
  }
  const value = await fn();
  store.set(key, { value, expires: now() + ttlMs });
  return value;
}

/** Drop a single entry (e.g. after a known-stale write). */
export function invalidate(key: string): void {
  store.delete(key);
}

/** Clear everything (tests). */
export function clearCache(): void {
  store.clear();
}
