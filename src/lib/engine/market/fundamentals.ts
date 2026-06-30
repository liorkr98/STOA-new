import YahooFinance from "yahoo-finance2";
import { getLatestFiling } from "@/lib/db/financials";
import type { CompanyFundamentals } from "./types";

const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

/**
 * Live fundamentals from Yahoo + latest SEC filing from Kaggle import (when available).
 */
export async function getCompanyFundamentals(symbol: string): Promise<CompanyFundamentals> {
  const sym = symbol.toUpperCase();
  const base: CompanyFundamentals = {
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

  try {
    const summary = await yahooFinance.quoteSummary(sym, {
      modules: ["financialData", "summaryDetail", "defaultKeyStatistics"],
    });
    base.peRatio = summary.summaryDetail?.trailingPE ?? null;
    base.marketCap = summary.summaryDetail?.marketCap ?? null;
    base.revenue = summary.financialData?.totalRevenue ?? null;
    base.profitMargin = summary.financialData?.profitMargins ?? null;
    base.eps = summary.defaultKeyStatistics?.trailingEps ?? null;
    if (base.peRatio || base.marketCap || base.revenue) base.source = "yahoo";
  } catch {
    // Yahoo summary unavailable — Kaggle data may still help.
  }

  try {
    const filing = await getLatestFiling(sym);
    if (filing) {
      base.latestFilingPeriod = filing.period_end;
      base.latestRevenue = filing.revenue;
      base.latestNetIncome = filing.net_income;
      base.source = base.source === "yahoo" ? "mixed" : "kaggle";
    }
  } catch {
    // DB not configured or table missing — skip.
  }

  return base;
}
