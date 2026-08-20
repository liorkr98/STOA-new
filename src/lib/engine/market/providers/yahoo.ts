import YahooFinance from "yahoo-finance2";
import type { MarketProvider, Quote } from "../types";

/**
 * Queue throughput. The previous concurrency 2 / 250ms interval capped the whole
 * process at 8 requests a second, so a page wanting 30 uncached symbols through
 * the per-symbol fallback path serialized into seconds of wall time before first
 * byte. Yahoo's unauthenticated endpoint tolerates more than this comfortably;
 * batching (fetchQuotes) plus the quote cache means we rarely approach it now.
 */
const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 8, interval: 100 },
});

/** Yahoo rejects very long symbol lists; chunk so one big page still batches. */
const MAX_SYMBOLS_PER_CALL = 40;

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * Yahoo's quote carries the day change and previous close alongside the
 * price; both are kept so list surfaces (tape, movers, sector rows) can show
 * a real day change instead of a reserved slot.
 */
function extractPrice(result: unknown): Quote | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const sym = String(r.symbol ?? "").toUpperCase();
  const price = num(r.regularMarketPrice);
  if (!price || price <= 0) return null;
  return {
    symbol: sym,
    price,
    changePercent: num(r.regularMarketChangePercent),
    previousClose: num(r.regularMarketPreviousClose),
    mock: false,
    available: true,
    source: "yahoo",
  };
}

export const yahooProvider: MarketProvider = {
  name: "yahoo",

  async fetchQuote(symbol: string): Promise<Quote | null> {
    try {
      const result = await yahooFinance.quote(symbol.toUpperCase());
      return extractPrice(result);
    } catch {
      return null;
    }
  },

  async fetchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const map = new Map<string, Quote>();
    if (symbols.length === 0) return map;

    const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += MAX_SYMBOLS_PER_CALL) {
      chunks.push(unique.slice(i, i + MAX_SYMBOLS_PER_CALL));
    }

    // Chunks run together: a long symbol list should cost one round trip's
    // latency, not one per chunk.
    const settled = await Promise.all(
      chunks.map(async (chunk) => {
        try {
          const results = await yahooFinance.quote(chunk);
          return Array.isArray(results) ? results : [results];
        } catch {
          // Fall through — caller will try per-symbol or the next provider.
          return [];
        }
      }),
    );

    for (const list of settled) {
      for (const r of list) {
        const q = extractPrice(r);
        if (q) map.set(q.symbol, q);
      }
    }
    return map;
  },
};
