/**
 * Centralized cache key builders. One place so key shapes never drift between
 * the writer that caches and the code that invalidates. All keys are namespaced
 * with a version prefix so a shape change can be rolled out by bumping `v`.
 */

const V = "v1";

export const cacheKeys = {
  marketQuote: (symbol: string) => `${V}:market:quote:${symbol.toUpperCase()}`,
  marketSparkline: (symbol: string) => `${V}:market:spark:${symbol.toUpperCase()}`,
  marketNews: (symbol: string) => `${V}:market:news:${symbol.toUpperCase()}`,
  marketPeers: (symbol: string) => `${V}:market:peers:${symbol.toUpperCase()}`,
  marketCandles: (symbol: string, range: string, interval: string) =>
    `${V}:market:candles:${symbol.toUpperCase()}:${range}:${interval}`,
  platformStats: () => `${V}:stats:platform`,
  creatorScore: (id: string) => `${V}:creator:score:${id}`,
  dispatch: (personalized: boolean, userId?: string) =>
    `${V}:dispatch:${personalized && userId ? userId : "public"}`,
} as const;

/** Prefix used for idempotency-key storage. */
export const idempotencyKeyPrefix = `${V}:idem`;

/** Prefix used for rate-limit windows (Upstash Ratelimit manages sub-keys). */
export const rateLimitPrefix = `${V}:rl`;
