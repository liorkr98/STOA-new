import "server-only";
import YahooFinance from "yahoo-finance2";
import { getLatestFiling } from "@/lib/db/financials";
import { fetchQuote } from "./providers/chain";
import type { CompanyFundamentals, Quote } from "./types";

const yahooFinance = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});

export interface StockSnapshot {
  quote: Quote;
  change: number | null;
  changePercent: number | null;
  previousClose: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  fiftyTwoWeekLow: number | null;
  fiftyTwoWeekHigh: number | null;
  volume: number | null;
  avgVolume: number | null;
  beta: number | null;
  dividendYield: number | null;
  forwardPe: number | null;
  recommendationKey: string | null;
  fundamentals: CompanyFundamentals;
}

/** Full ticker snapshot for the markets research page (one Yahoo round-trip when possible). */
export async function getStockSnapshot(symbol: string): Promise<StockSnapshot> {
  const sym = symbol.toUpperCase();
  const quote = await fetchQuote(sym);

  const fundamentals: CompanyFundamentals = {
    symbol: sym,
    peRatio: null,
    marketCap: null,
    revenue: null,
    profitMargin: null,
    eps: null,
    latestFilingPeriod: null,
    latestRevenue: null,
    latestNetIncome: null,
    source: "none",
  };

  let change: number | null = null;
  let changePercent: number | null = null;
  let previousClose: number | null = null;
  let dayLow: number | null = null;
  let dayHigh: number | null = null;
  let fiftyTwoWeekLow: number | null = null;
  let fiftyTwoWeekHigh: number | null = null;
  let volume: number | null = null;
  let avgVolume: number | null = null;
  let beta: number | null = null;
  let dividendYield: number | null = null;
  let forwardPe: number | null = null;
  let recommendationKey: string | null = null;

  try {
    const [liveQuote, summary] = await Promise.all([
      yahooFinance.quote(sym),
      yahooFinance.quoteSummary(sym, {
        modules: ["financialData", "summaryDetail", "defaultKeyStatistics", "recommendationTrend"],
      }),
    ]);

    if (quote.available && liveQuote.regularMarketPrice) {
      quote.price = liveQuote.regularMarketPrice;
    }
    change = liveQuote.regularMarketChange ?? null;
    changePercent = liveQuote.regularMarketChangePercent ?? null;
    previousClose = liveQuote.regularMarketPreviousClose ?? null;
    dayLow = liveQuote.regularMarketDayLow ?? null;
    dayHigh = liveQuote.regularMarketDayHigh ?? null;
    fiftyTwoWeekLow = liveQuote.fiftyTwoWeekLow ?? summary.summaryDetail?.fiftyTwoWeekLow ?? null;
    fiftyTwoWeekHigh = liveQuote.fiftyTwoWeekHigh ?? summary.summaryDetail?.fiftyTwoWeekHigh ?? null;
    volume = liveQuote.regularMarketVolume ?? null;
    avgVolume = liveQuote.averageDailyVolume3Month ?? summary.summaryDetail?.averageVolume ?? null;

    fundamentals.peRatio = summary.summaryDetail?.trailingPE ?? null;
    fundamentals.marketCap = summary.summaryDetail?.marketCap ?? null;
    fundamentals.revenue = summary.financialData?.totalRevenue ?? null;
    fundamentals.profitMargin = summary.financialData?.profitMargins ?? null;
    fundamentals.eps = summary.defaultKeyStatistics?.trailingEps ?? null;
    beta = summary.defaultKeyStatistics?.beta ?? null;
    dividendYield = summary.summaryDetail?.dividendYield ?? null;
    forwardPe = summary.summaryDetail?.forwardPE ?? null;
    recommendationKey = null;
    const trend = summary.recommendationTrend?.trend;
    if (trend?.length) {
      const last = trend[trend.length - 1] as Record<string, number | undefined>;
      const scores = [
        { label: "Strong buy", n: last.strongBuy ?? 0 },
        { label: "Buy", n: last.buy ?? 0 },
        { label: "Hold", n: last.hold ?? 0 },
        { label: "Sell", n: last.sell ?? 0 },
        { label: "Strong sell", n: last.strongSell ?? 0 },
      ];
      const top = scores.sort((a, b) => b.n - a.n)[0];
      if (top.n > 0) recommendationKey = top.label;
    }
    if (fundamentals.peRatio || fundamentals.marketCap) fundamentals.source = "yahoo";
  } catch {
    // Quote chain may still have a price from batch providers.
  }

  try {
    const filing = await getLatestFiling(sym);
    if (filing) {
      fundamentals.latestFilingPeriod = filing.period_end;
      fundamentals.latestRevenue = filing.revenue;
      fundamentals.latestNetIncome = filing.net_income;
      fundamentals.source = fundamentals.source === "yahoo" ? "mixed" : "kaggle";
    }
  } catch {
    // optional
  }

  return {
    quote,
    change,
    changePercent,
    previousClose,
    dayLow,
    dayHigh,
    fiftyTwoWeekLow,
    fiftyTwoWeekHigh,
    volume,
    avgVolume,
    beta,
    dividendYield,
    forwardPe,
    recommendationKey,
    fundamentals,
  };
}