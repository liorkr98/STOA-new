import YahooFinance from "yahoo-finance2";
import type { MarketProvider, Quote } from "../types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function toQuote(symbol: string, price: number | null | undefined): Quote | null {
  if (!price || price <= 0) return null;
  return { symbol: symbol.toUpperCase(), price, mock: false, source: "yahoo" };
}

function extractPrice(result: unknown): Quote | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;
  const sym = String(r.symbol ?? "").toUpperCase();
  const price = r.regularMarketPrice;
  return toQuote(sym, typeof price === "number" ? price : null);
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
