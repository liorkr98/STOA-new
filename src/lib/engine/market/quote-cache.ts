import "server-only";

import { TTL } from "@/lib/market/cache";
import type { Quote } from "./types";

/**
 * Per-symbol quote cache.
 *
 * Quotes were the one hot path with no caching at all, while every list surface
 * (tape, movers, sector rows, Today's sidebar, Markets) asks for overlapping
 * symbol sets on every request. Caching per symbol rather than per call site
 * means the second page to want NVDA pays nothing, and a 30-symbol batch where
 * 28 are warm collapses to a 2-symbol fetch.
 *
 * In-process and per-instance by design, matching src/lib/market/cache.ts. With
 * Upstash Redis configured (scale-hardening branch) this becomes the L1 in front
 * of a shared L2; the shape here does not change.
 */

interface Entry {
  quote: Quote;
  expires: number;
}

const store = new Map<string, Entry>();

/** Market data goes stale fast; 15s matches TTL.quote. */
const QUOTE_TTL_MS = TTL.quote;

/**
 * Longer TTL outside US market hours, when prices are not moving. Cuts the
 * overnight and weekend cost of every list surface to near zero.
 */
function ttlFor(now: Date): number {
  const day = now.getUTCDay();
  if (day === 0 || day === 6) return 10 * 60_000;

  // Regular session is 13:30-20:00 UTC (allowing for DST drift at the edges).
  const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const open = 13 * 60;
  const close = 20 * 60 + 30;
  return minutes >= open && minutes <= close ? QUOTE_TTL_MS : 5 * 60_000;
}

export function getCachedQuotes(symbols: string[]): {
  hits: Map<string, Quote>;
  misses: string[];
} {
  const hits = new Map<string, Quote>();
  const misses: string[] = [];
  const now = Date.now();

  for (const symbol of symbols) {
    const entry = store.get(symbol);
    if (entry && entry.expires > now) hits.set(symbol, entry.quote);
    else misses.push(symbol);
  }

  return { hits, misses };
}

export function putCachedQuotes(quotes: Iterable<[string, Quote]>): void {
  const ttl = ttlFor(new Date());
  const expires = Date.now() + ttl;
  for (const [symbol, quote] of quotes) {
    // Never cache an unavailable quote: a transient provider failure would
    // otherwise blank a price for the whole TTL.
    if (!quote.available || quote.price == null) continue;
    store.set(symbol, { quote, expires });
  }
}

/** Test hook. */
export function clearQuoteCache(): void {
  store.clear();
}
