/** Where a quote price came from. */
export type QuoteSource = "yahoo" | "twelvedata" | "alphavantage" | "mock";

export interface Quote {
  symbol: string;
  price: number;
  /** True when no live provider returned a price. */
  mock: boolean;
  source: QuoteSource;
}

export interface MarketProvider {
  name: QuoteSource;
  /** Returns null when the provider cannot quote this symbol (try next). */
  fetchQuote(symbol: string): Promise<Quote | null>;
  fetchQuotes?(symbols: string[]): Promise<Map<string, Quote>>;
}

export interface CompanyFundamentals {
  symbol: string;
  /** Trailing P/E from live feed, when available. */
  peRatio: number | null;
  marketCap: number | null;
  revenue: number | null;
  profitMargin: number | null;
  eps: number | null;
  /** Latest SEC filing period from Kaggle / DB, when imported. */
  latestFilingPeriod: string | null;
  latestRevenue: number | null;
  latestNetIncome: number | null;
  source: "yahoo" | "kaggle" | "mixed" | "none";
}
