import type { MarketProvider, Quote } from "../types";

/**
 * Twelve Data free tier: ~800 requests/day.
 * https://twelvedata.com/
 */
export const twelveDataProvider: MarketProvider = {
  name: "twelvedata",

  async fetchQuote(symbol: string): Promise<Quote | null> {
    const key = process.env.TWELVE_DATA_API_KEY;
    if (!key) return null;

    const sym = symbol.toUpperCase();
    try {
      const url = new URL("https://api.twelvedata.com/price");
      url.searchParams.set("symbol", sym);
      url.searchParams.set("apikey", key);
      const res = await fetch(url, { next: { revalidate: 30 } });
      if (!res.ok) return null;
      const json = (await res.json()) as { price?: string; status?: string };
      if (json.status === "error") return null;
      const price = Number(json.price);
      if (!price || price <= 0) return null;
      return { symbol: sym, price, mock: false, available: true, source: "twelvedata" };
    } catch {
      return null;
    }
  },
};
