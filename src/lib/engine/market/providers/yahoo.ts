import YahooFinance from "yahoo-finance2";
import type { MarketProvider, Quote } from "../types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});

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

    try {
      const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
      const results = await yahooFinance.quote(unique);
      const list = Array.isArray(results) ? results : [results];
      for (const r of list) {
        const q = extractPrice(r);
        if (q) map.set(q.symbol, q);
      }
    } catch {
      // Fall through — caller will try per-symbol or next provider.
    }
    return map;
  },
};
