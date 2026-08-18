import type { Metadata } from "next";
import { getStockSnapshot } from "@/lib/engine/market";
import { getCandles, getCandlesBetween } from "@/lib/engine/market/candles";
import { listByTicker, publishedReportCount, tickerCoverage } from "@/lib/db/reports";
import { getTickerRow, listSectorPeers } from "@/lib/db/tickers";
import { hasResolvedHistory } from "@/lib/db/predictions";
import { EmptyState } from "@/components/ui/empty-state";
import { CallsChart } from "@/components/markets/calls-chart";
import {
  StockCoverageBlock,
  StockFundamentals,
  StockHeader,
  StockOpenCalls,
  StockPeers,
  StockPublications,
  StockResolvedHistory,
} from "@/components/markets/stock-sections";
import { buildStockCalls } from "@/lib/markets/build-stock";
import { buildEtfSnapshot } from "@/lib/markets/build-etf";
import { curatedEtf } from "@/lib/markets/etfs";
import { EtfView } from "@/components/markets/etf-view";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import type { ChartRange } from "@/lib/market/candle-types";
import { CUSTOM_RANGE, STOCK_RANGES } from "@/lib/markets/call-types";
import type { TodayItem } from "@/lib/today/types";
import type { Report } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const sym = ticker.toUpperCase();
  // The instrument table is equities only, so a fund's name comes from the
  // curated list rather than falling back to the bare symbol.
  const meta = await getTickerRow(sym);
  const name = meta?.name ?? curatedEtf(sym)?.name ?? sym;

  // Same guard the sitemap uses (src/lib/db/reports.ts: publishedReportCount /
  // allTickerCoverage) so a page's indexability and its sitemap presence can
  // never disagree.
  const [reportCount, resolvedHistory] = await Promise.all([
    publishedReportCount(sym),
    hasResolvedHistory(sym),
  ]);
  const hasCoverage = reportCount > 0;

  // "Locked" and "fact-checked" are true the instant a report publishes.
  // "Verified track record" implies resolved history -- only claim that once
  // a call has actually resolved for this ticker.
  const description = !hasCoverage
    ? `${name} (${sym}) on Stoa: independent analyst research with a permanent, public call record.`
    : resolvedHistory
      ? `Review the analyst record on ${name}: locked calls, entry and exit prices, and graded outcomes on Stoa.`
      : `Locked, fact-checked research and price calls for ${name}, each attributed by analyst on Stoa's permanent ledger.`;

  const ogImage = `/api/og/stock?ticker=${sym}`;

  return {
    // The root layout's title.template already appends " · Stoa" (layout.tsx).
    title: `${name} (${sym}) · Analyst Ledger`,
    description,
    // A page with zero published reports is thin content -- render normally
    // (no 404, the ticker itself is real) but keep it out of the index until
    // a first report gives it something to rank for.
    robots: hasCoverage ? undefined : { index: false, follow: true },
    alternates: {
      // One canonical URL per ticker on this exchange. Cross-listed symbols
      // (e.g. a TASE-listed twin of a US ticker) aren't disambiguated by a
      // separate exchange suffix today, so there's no live duplicate-content
      // pair to worry about yet -- this still pins a stable canonical per
      // page rather than leaving it unset.
      canonical: `/markets/${sym}`,
    },
    openGraph: {
      title: `${name} (${sym})`,
      description,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
  };
}

function toItem(report: Report): TodayItem | null {
  if (!report.author) return null;
  const badge = ["Video"];
  if (report.prediction || report.type === "call") badge.push("Call");
  badge.push("Cards");
  if (report.body) badge.push("Thesis");

  return {
    reportId: report.id,
    type: report.type,
    ticker: report.ticker ?? report.prediction?.ticker ?? null,
    direction: report.prediction?.direction ?? null,
    contentBadge: badge,
    headline: storyHeadline(report),
    deck: storyDek(report),
    author: {
      handle: report.author.handle,
      displayName: report.author.display_name,
      avatarUrl: report.author.avatar_url,
    },
    publishedAt: report.published_at ?? report.created_at,
    access: report.access,
    price: report.price,
    saved: false,
    thumb: null,
  };
}

export default async function TickerPage({
  params,
  searchParams,
}: {
  params: Promise<{ ticker: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const [{ ticker }, query] = await Promise.all([params, searchParams]);
  const sym = ticker.toUpperCase();

  const custom = query.range === CUSTOM_RANGE && query.from && query.to;
  const range: string = custom
    ? CUSTOM_RANGE
    : (STOCK_RANGES as string[]).includes(query.range ?? "")
      ? (query.range as ChartRange)
      : "1Y";

  const candlesFor = () =>
    custom
      ? getCandlesBetween(sym, query.from as string, query.to as string)
      : getCandles(sym, range as ChartRange);

  // Funds resolve live from the provider, so any recognized symbol reaches the
  // right layout whether or not it is on the curated Explore list.
  const [etf, reports, calls, candles, coverage] = await Promise.all([
    buildEtfSnapshot(sym),
    listByTicker(sym),
    buildStockCalls(sym),
    candlesFor(),
    tickerCoverage(),
  ]);

  const publications = reports.flatMap((r: Report) => {
    const item = toItem(r);
    return item ? [item] : [];
  });

  if (etf) {
    return (
      <EtfView
        etf={etf}
        candles={candles}
        calls={calls}
        publications={publications}
        coverage={coverage}
        range={range}
        customFrom={query.from}
        customTo={query.to}
      />
    );
  }

  const [snapshot, meta] = await Promise.all([getStockSnapshot(sym), getTickerRow(sym)]);
  const peers = meta?.sector ? await listSectorPeers(meta.sector, sym, 6) : [];

  return (
    <article className="markets-page mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <StockHeader
        ticker={sym}
        name={meta?.name ?? sym}
        exchange={meta?.exchange ?? null}
        currentPrice={snapshot.quote.price}
        changePercent={snapshot.changePercent}
        marketCap={snapshot.fundamentals.marketCap}
        forwardPe={snapshot.forwardPe}
        low52={snapshot.fiftyTwoWeekLow}
        high52={snapshot.fiftyTwoWeekHigh}
      />

      <CallsChart
        ticker={sym}
        candles={candles}
        openCalls={calls.openCalls}
        resolvedCalls={calls.resolvedCalls}
        range={range}
        customFrom={query.from}
        customTo={query.to}
      />

      <StockCoverageBlock ticker={sym} coverage={calls.coverage} />
      <StockOpenCalls calls={calls.openCalls} />
      <StockPublications items={publications} />
      <StockResolvedHistory calls={calls.resolvedCalls} />

      <StockFundamentals
        peRatio={snapshot.fundamentals.peRatio}
        marketCap={snapshot.fundamentals.marketCap}
        revenue={snapshot.fundamentals.revenue}
        profitMargin={snapshot.fundamentals.profitMargin}
        eps={snapshot.fundamentals.eps}
      />

      <StockPeers peers={peers} coverage={coverage} />

      {publications.length === 0 && calls.openCalls.length === 0 && (
        <div className="mt-8">
          <EmptyState
            title={`No Stoa coverage on ${sym} yet`}
            body="When an analyst publishes a call or report on this ticker, it will show up here."
          />
        </div>
      )}
    </article>
  );
}
