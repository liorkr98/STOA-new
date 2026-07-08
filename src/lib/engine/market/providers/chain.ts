import type { MarketProvider, Quote, QuoteSource } from "../types";
import { alphaVantageProvider } from "./alphavantage";
import { twelveDataProvider } from "./twelvedata";
import { yahooProvider } from "./yahoo";

/** Primary: Yahoo (no key). Fallbacks: Twelve Data, Alpha Vantage. No mock prices. */
const PROVIDERS: MarketProvider[] = [
  yahooProvider,
  twelveDataProvider,
  alphaVantageProvider,
];

function unavailableQuote(symbol: string): Quote {
  const sym = symbol.toUpperCase();
  return {
    symbol: sym,
    price: null,
    mock: false,
    available: false,
    source: "unavailable",
  };
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase();

  for (const provider of PROVIDERS) {
    const quote = await provider.fetchQuote(sym);
    if (quote?.available && quote.price != null) return quote;
  }

  return unavailableQuote(sym);
}

export async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const map = new Map<string, Quote>();

  if (unique.length === 0) return map;

  if (yahooProvider.fetchQuotes) {
    const yahooMap = await yahooProvider.fetchQuotes(unique);
    for (const [sym, q] of yahooMap) {
      if (q.available && q.price != null) map.set(sym, q);
    }
  }

  const missing = unique.filter((s) => !map.has(s));
  for (const sym of missing) {
    map.set(sym, await fetchQuote(sym));
  }

  return map;
}

export function liveSources(): QuoteSource[] {
  const sources: QuoteSource[] = ["yahoo"];
  if (process.env.TWELVE_DATA_API_KEY) sources.push("twelvedata");
  if (process.env.ALPHA_VANTAGE_API_KEY) sources.push("alphavantage");
  return sources;
}
