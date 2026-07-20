import "server-only";

import { getRedis } from "@/lib/redis";
import { idempotencyKeyPrefix } from "@/lib/cache/keys";

/**
 * HTTP Idempotency-Key support for NON-money mutations (publish, video ops). A
 * flaky mobile connection can cause the client to retry a request whose response
 * was lost; replaying the stored result makes the retry a no-op instead of a
 * double-publish.
 *
 * Money mutations do NOT use this - they use a Postgres `client_request_id`
 * unique constraint so a Redis eviction can never permit a double-charge.
 *
 * Requires Redis. When Redis is absent the helper is a pass-through (no
 * dedup) - acceptable because these operations also have server-side guards
 * (publish is a state transition; duplicate video rows are cleaned up).
 */

const TTL_SECONDS = 24 * 60 * 60;

export interface StoredIdempotentResponse {
  status: number;
  body: unknown;
}

export function readIdempotencyKey(req: Request): string | null {
  const key = req.headers.get("Idempotency-Key")?.trim();
  if (!key) return null;
  // Bound the key so a client can't store arbitrarily large blobs as keys.
  return key.length > 200 ? key.slice(0, 200) : key;
}

function storageKey(scope: string, key: string): string {
  return `${idempotencyKeyPrefix}:${scope}:${key}`;
}

/** Return a previously stored response for this key, or null. */
export async function getStoredResponse(
  scope: string,
  key: string,
): Promise<StoredIdempotentResponse | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return (await redis.get<StoredIdempotentResponse>(storageKey(scope, key))) ?? null;
  } catch {
    return null;
  }
}

/**
 * Reserve a key before doing the work. Returns false if the key is already in
 * flight or completed (caller should then replay via getStoredResponse). Uses
 * SET NX so two concurrent retries can't both proceed.
 */
export async function reserveIdempotencyKey(scope: string, key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return true;
  try {
    const res = await redis.set(storageKey(scope, key), { status: 0, body: null }, {
      nx: true,
      ex: TTL_SECONDS,
    });
    return res === "OK";
  } catch {
    return true;
  }
}

export async function storeResponse(
  scope: string,
  key: string,
  response: StoredIdempotentResponse,
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(storageKey(scope, key), response, { ex: TTL_SECONDS });
  } catch {
    // Non-fatal: worst case the next retry re-runs the work.
  }
}

/** Release a reservation after a failure so the client can legitimately retry. */
export async function releaseIdempotencyKey(scope: string, key: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(storageKey(scope, key));
  } catch {
    // Non-fatal.
  }
}
