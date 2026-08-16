import "server-only";
import YahooFinance from "yahoo-finance2";
import { fetchQuote } from "@/lib/engine/market/providers/chain";
import type { Quote } from "@/lib/engine/market/types";

const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  queue: { concurrency: 2, interval: 250 },
});

export interface EtfHolding {
  symbol: string;
  company: string;
  weightPct: number;
}

export interface SectorWeight {
  sector: string;
  weightPct: number;
}

export interface EtfSnapshot {
  symbol: string;
  name: string;
  exchange: string | null;
  quote: Quote;
  changePercent: number | null;
  /** Total net assets. Yahoo exposes this for every fund tested. */
  aum: number | null;
  /** Net annual report expense ratio, as a fraction (0.0035 = 0.35%). */
  expenseRatio: number | null;
  inceptionDate: string | null;
  /**
   * Yahoo publishes a 3-month average and a 10-day average, not a 30-day one.
   * The 3-month figure is carried here and labelled honestly in the UI rather
   * than relabelled as something it is not.
   */
  averageVolume3Month: number | null;
  family: string | null;
  category: string | null;
  holdings: EtfHolding[];
  sectorWeights: SectorWeight[];
}

const SECTOR_LABEL: Record<string, string> = {
  realestate: "Real estate",
  consumer_cyclical: "Consumer cyclical",
  basic_materials: "Basic materials",
  consumer_defensive: "Consumer defensive",
  technology: "Technology",
  communication_services: "Communication services",
  financial_services: "Financial services",
  utilities: "Utilities",
  industrials: "Industrials",
  energy: "Energy",
  healthcare: "Healthcare",
};

/** True when the provider classifies this symbol as a fund rather than equity. */
export async function isEtfSymbol(symbol: string): Promise<boolean> {
  try {
    const r = await yf.quoteSummary(symbol.toUpperCase(), { modules: ["price"] });
    return r.price?.quoteType === "ETF";
  } catch {
    return false;
  }
}

/**
 * A fund resolved live from the market data provider. Fields the provider does
 * not carry for a given fund come back null or empty, and the page hides those
 * sections: a commodity or futures fund legitimately has no holdings and no
 * sector breakdown, and showing empty rows would imply the data is missing
 * rather than inapplicable.
 *
 * Net fund flows are not available from this provider at all, for any fund.
 */
export async function buildEtfSnapshot(symbol: string): Promise<EtfSnapshot | null> {
  const sym = symbol.toUpperCase();
  const quote = await fetchQuote(sym);

  try {
    const r = await yf.quoteSummary(sym, {
      modules: [
        "price",
        "summaryDetail",
        "defaultKeyStatistics",
        "fundProfile",
        "topHoldings",
      ],
    });

    if (r.price?.quoteType !== "ETF") return null;

    const ks = r.defaultKeyStatistics;
    const fp = r.fundProfile;
    const th = r.topHoldings;

    const holdings: EtfHolding[] = (th?.holdings ?? [])
      .filter((h) => h.symbol && h.holdingPercent != null)
      .map((h) => ({
        symbol: String(h.symbol).toUpperCase(),
        company: String(h.holdingName ?? h.symbol),
        weightPct: Number(h.holdingPercent) * 100,
      }));

    const sectorWeights: SectorWeight[] = (th?.sectorWeightings ?? [])
      .flatMap((row) => Object.entries(row as Record<string, number>))
      .filter(([, v]) => typeof v === "number" && v > 0)
      .map(([k, v]) => ({ sector: SECTOR_LABEL[k] ?? k, weightPct: v * 100 }))
      .sort((a, b) => b.weightPct - a.weightPct);

    const inception = ks?.fundInceptionDate;

    return {
      symbol: sym,
      name: r.price?.longName ?? r.price?.shortName ?? sym,
      exchange: r.price?.exchangeName ?? null,
      quote,
      changePercent: r.price?.regularMarketChangePercent ?? null,
      aum: ks?.totalAssets ?? null,
      expenseRatio: fp?.feesExpensesInvestment?.annualReportExpenseRatio ?? null,
      inceptionDate:
        inception instanceof Date
          ? inception.toISOString()
          : inception
            ? String(inception)
            : null,
      averageVolume3Month: r.summaryDetail?.averageVolume ?? null,
      family: fp?.family ?? null,
      category: ks?.category ?? null,
      holdings,
      sectorWeights,
    };
  } catch {
    return null;
  }
}
