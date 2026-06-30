import { mockPrice } from "../mock";
import type { MarketProvider, Quote, QuoteSource } from "../types";
import { alphaVantageProvider } from "./alphavantage";
import { twelveDataProvider } from "./twelvedata";
import { yahooProvider } from "./yahoo";

/** Primary: Yahoo (no key). Fallbacks: Twelve Data, Alpha Vantage, then mock. */
const PROVIDERS: MarketProvider[] = [
  yahooProvider,
  twelveDataProvider,
  alphaVantageProvider,
];

function mockQuote(symbol: string): Quote {
  const sym = symbol.toUpperCase();
  return { symbol: sym, price: mockPrice(sym), mock: true, source: "mock" };
}

export async function fetchQuote(symbol: string): Promise<Quote> {
  const sym = symbol.toUpperCase();

  for (const provider of PROVIDERS) {
    const quote = await provider.fetchQuote(sym);
    if (quote) return quote;
  }

  return mockQuote(sym);
}

export async function fetchQuotesBatch(symbols: string[]): Promise<Map<string, Quote>> {
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  const map = new Map<string, Quote>();

  if (unique.length === 0) return map;

  // Yahoo supports multi-symbol quotes in one call — try batch first.
  if (yahooProvider.fetchQuotes) {
    const yahooMap = await yahooProvider.fetchQuotes(unique);
    for (const [sym, q] of yahooMap) map.set(sym, q);
  }

  const missing = unique.filter((s) => !map.has(s));
  for (const sym of missing) {
    let found: Quote | null = null;
    for (const provider of PROVIDERS) {
      const quote = await provider.fetchQuote(sym);
      if (quote) {
        found = quote;
        break;
      }
    }
    map.set(sym, found ?? mockQuote(sym));
  }

  return map;
}

export function liveSources(): QuoteSource[] {
  const sources: QuoteSource[] = ["yahoo"];
  if (process.env.TWELVE_DATA_API_KEY) sources.push("twelvedata");
  if (process.env.ALPHA_VANTAGE_API_KEY) sources.push("alphavantage");
  return sources;
}
