import type { MarketProvider, Quote } from "../types";

/**
 * Alpha Vantage free tier: 25 requests/day — last-resort fallback only.
 * https://www.alphavantage.co/
 */
export const alphaVantageProvider: MarketProvider = {
  name: "alphavantage",

  async fetchQuote(symbol: string): Promise<Quote | null> {
    const key = process.env.ALPHA_VANTAGE_API_KEY;
    if (!key) return null;

    const sym = symbol.toUpperCase();
    try {
      const url = new URL("https://www.alphavantage.co/query");
      url.searchParams.set("function", "GLOBAL_QUOTE");
      url.searchParams.set("symbol", sym);
      url.searchParams.set("apikey", key);
      const res = await fetch(url, { next: { revalidate: 60 } });
      if (!res.ok) return null;
      const json = (await res.json()) as {
        "Global Quote"?: { "05. price"?: string };
        Note?: string;
      };
      if (json.Note) return null;
      const price = Number(json["Global Quote"]?.["05. price"]);
      if (!price || price <= 0) return null;
      return { symbol: sym, price, mock: false, available: true, source: "alphavantage" };
    } catch {
      return null;
    }
  },
};
