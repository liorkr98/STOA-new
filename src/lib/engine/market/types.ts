/** Where a quote price came from. */
export type QuoteSource = "yahoo" | "twelvedata" | "alphavantage" | "unavailable";

export interface Quote {
  symbol: string;
  price: number | null;
  /** Day change in percent, when the provider carries it (Yahoo does on the batch path). Null otherwise. */
  changePercent?: number | null;
  /** Previous session close, when carried. Null otherwise. */
  previousClose?: number | null;
  /** @deprecated Always false — mock prices removed. */
  mock: boolean;
  available: boolean;
  source: QuoteSource;
}

export interface MarketProvider {
  name: QuoteSource;
  fetchQuote(symbol: string): Promise<Quote | null>;
  fetchQuotes?(symbols: string[]): Promise<Map<string, Quote>>;
}

export interface CompanyFundamentals {
  symbol: string;
  peRatio: number | null;
  marketCap: number | null;
  revenue: number | null;
  profitMargin: number | null;
  eps: number | null;
  latestFilingPeriod: string | null;
  latestRevenue: number | null;
  latestNetIncome: number | null;
  source: "yahoo" | "kaggle" | "mixed" | "none";
}
