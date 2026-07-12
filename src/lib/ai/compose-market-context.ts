import "server-only";
import { getCompanyFundamentals, getQuote } from "@/lib/engine/market";
import { listFilings } from "@/lib/db/financials";
import { finnhub, fmp, MarketDataError } from "@/lib/market";

export interface ComposeMarketContext {
  ticker: string;
  price: number | null;
  available: boolean;
  source?: string;
  news: { headline: string; datetime?: string | null; source?: string | null; url?: string }[];
  fundamentals: {
    peRatio: number | null;
    marketCap: number | null;
    revenue: number | null;
    profitMargin: number | null;
    eps: number | null;
    latestFilingPeriod: string | null;
    latestRevenue: number | null;
    latestNetIncome: number | null;
    source: string;
  } | null;
  filings: {
    period_end: string;
    frequency: string;
    revenue: number | null;
    net_income: number | null;
    eps: number | null;
  }[];
  peers: string[];
}

function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1) return n.toFixed(2);
  return String(n);
}

/** Quote + news + fundamentals + filings + peers for Research AI (fail soft). */
export async function loadComposeMarketContext(
  ticker: string | undefined,
): Promise<ComposeMarketContext | null> {
  const sym = ticker?.trim().toUpperCase();
  if (!sym || sym.length > 10) return null;

  const quotePromise = getQuote(sym).catch(() => null);
  const fundamentalsPromise = getCompanyFundamentals(sym).catch(() => null);
  const filingsPromise = listFilings(sym, 4).catch(() => []);
  const peersPromise = (async () => {
    try {
      const set = await fmp.getPeers(sym);
      return (set.peers ?? []).map((p) => p.toUpperCase()).filter((p) => p && p !== sym).slice(0, 5);
    } catch {
      return [] as string[];
    }
  })();
  const newsPromise = (async () => {
    try {
      const to = new Date();
      const from = new Date(Date.now() - 14 * 86_400_000);
      const items = await finnhub.getCompanyNews(sym, ymd(from), ymd(to));
      return items.slice(0, 6).map((n) => ({
        headline: n.headline,
        datetime: n.datetime,
        source: n.source,
        url: n.url,
      }));
    } catch (e) {
      if (e instanceof MarketDataError) return [];
      return [];
    }
  })();

  const [quote, news, fundamentals, filings, peers] = await Promise.all([
    quotePromise,
    newsPromise,
    fundamentalsPromise,
    filingsPromise,
    peersPromise,
  ]);

  return {
    ticker: sym,
    price: quote?.price ?? null,
    available: Boolean(quote?.available && quote.price != null),
    source: quote?.source,
    news,
    fundamentals: fundamentals
      ? {
          peRatio: fundamentals.peRatio,
          marketCap: fundamentals.marketCap,
          revenue: fundamentals.revenue,
          profitMargin: fundamentals.profitMargin,
          eps: fundamentals.eps,
          latestFilingPeriod: fundamentals.latestFilingPeriod,
          latestRevenue: fundamentals.latestRevenue,
          latestNetIncome: fundamentals.latestNetIncome,
          source: fundamentals.source,
        }
      : null,
    filings: filings.map((f) => ({
      period_end: f.period_end,
      frequency: f.frequency,
      revenue: f.revenue,
      net_income: f.net_income,
      eps: f.eps,
    })),
    peers,
  };
}

export function formatMarketContextXml(ctx: ComposeMarketContext): string {
  const newsLines =
    ctx.news.length === 0
      ? "none"
      : ctx.news
          .map((n, i) => `${i + 1}. ${n.headline}${n.source ? ` (${n.source})` : ""}`)
          .join("\n");

  const f = ctx.fundamentals;
  const fundLines = f
    ? [
        `pe: ${fmtNum(f.peRatio)}`,
        `market_cap: ${fmtNum(f.marketCap)}`,
        `revenue: ${fmtNum(f.revenue)}`,
        `profit_margin: ${f.profitMargin != null ? `${(f.profitMargin * 100).toFixed(1)}%` : "n/a"}`,
        `eps: ${fmtNum(f.eps)}`,
        `latest_filing_period: ${f.latestFilingPeriod ?? "n/a"}`,
        `latest_filing_revenue: ${fmtNum(f.latestRevenue)}`,
        `latest_filing_net_income: ${fmtNum(f.latestNetIncome)}`,
        `fundamentals_source: ${f.source}`,
      ].join("\n")
    : "none";

  const filingLines =
    ctx.filings.length === 0
      ? "none"
      : ctx.filings
          .map(
            (row, i) =>
              `${i + 1}. ${row.period_end} (${row.frequency}) rev=${fmtNum(row.revenue)} ni=${fmtNum(row.net_income)} eps=${fmtNum(row.eps)}`,
          )
          .join("\n");

  const peerLine = ctx.peers.length ? ctx.peers.join(", ") : "none";

  return `<market_context>
ticker: ${ctx.ticker}
price: ${ctx.available && ctx.price != null ? ctx.price : "unavailable"}
quote_source: ${ctx.source ?? "none"}
peers: ${peerLine}
fundamentals:
${fundLines}
recent_filings:
${filingLines}
recent_headlines:
${newsLines}
</market_context>`;
}

/** Ticker + up to 3 peers for comparison blocks. */
export function peerSymbolsForBlocks(ctx: ComposeMarketContext | null): string[] {
  if (!ctx?.ticker) return [];
  return [ctx.ticker, ...ctx.peers].slice(0, 4);
}
