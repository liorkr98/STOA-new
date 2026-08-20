import "server-only";

import { unstable_cache } from "next/cache";
import { cached } from "@/lib/market/cache";

/**
 * Cross-request cache for public, JSON-serializable payloads.
 *
 * L1 is the in-process map (warm instance). L2 is Next's data cache, which is
 * what actually helps on Vercel: a second visitor to Markets should not wait
 * on Singapore round trips and Yahoo just because they hit a different isolate.
 */
export function cachedPage<T>(
  key: string,
  revalidateSeconds: number,
  fn: () => Promise<T>,
): Promise<T> {
  const ttlMs = revalidateSeconds * 1000;
  return cached(`page:${key}`, ttlMs, () =>
    unstable_cache(fn, [key], { revalidate: revalidateSeconds })(),
  );
}
