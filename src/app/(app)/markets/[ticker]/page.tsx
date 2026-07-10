import type { Metadata } from "next";
import { Suspense } from "react";
import { getStockSnapshot } from "@/lib/engine/market";
import { listByTicker } from "@/lib/db/reports";
import { listFilings } from "@/lib/db/financials";
<<<<<<< HEAD
import { getTickerRow } from "@/lib/db/tickers";
=======
import { UNIVERSE } from "@/lib/universe";
import { publishedReportCount, hasResolvedHistory } from "@/lib/seo/ticker-coverage";
>>>>>>> 37099d0 (feat(seo): institutional SEO infrastructure for stock pages and reports)
import { ReportCard } from "@/components/report-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FundamentalsPanel } from "@/components/markets/fundamentals-panel";
import { CompanyFinancials } from "@/components/markets/company-financials";
import { MarketTradingViewChartCard } from "@/components/markets/market-tradingview-chart-card";
import { CompanyNews } from "@/components/markets/company-news";
import {
  SectorPeers,
  StockKeyStats,
  StockQuoteHeader,
  StockRangeBar,
} from "@/components/markets/stock-research-panels";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
<<<<<<< HEAD
  const meta = await getTickerRow(ticker.toUpperCase());
=======
  const sym = ticker.toUpperCase();
  const meta = UNIVERSE.find((u) => u.ticker === sym);
  const name = meta?.name ?? sym;

  // Same guard the sitemap uses (src/lib/seo/ticker-coverage.ts) so a page's
  // indexability and its sitemap presence can never disagree.
  const [reportCount, resolvedHistory] = await Promise.all([
    publishedReportCount(sym),
    hasResolvedHistory(sym),
  ]);
  const hasCoverage = reportCount > 0;

  // "Locked" and "fact-checked" are true the instant a report publishes.
  // "Verified track record" implies resolved history -- only claim that once
  // a call has actually resolved for this ticker.
  const description = !hasCoverage
    ? `${name} (${sym}) on Stoa: independent analyst research with a permanent, publicly scored track record.`
    : resolvedHistory
      ? `Review ${name}'s verified analyst track record: locked calls, resolved outcomes, and public Track Scores on Stoa.`
      : `Locked, fact-checked research and price calls for ${name}. Track analyst Track Scores and theses on Stoa's permanent ledger.`;

  const ogImage = `/api/og/stock?ticker=${sym}`;

>>>>>>> 37099d0 (feat(seo): institutional SEO infrastructure for stock pages and reports)
  return {
    // The root layout's title.template already appends " · Stoa" (layout.tsx).
    title: `${name} (${sym}) · Analyst Ledger & Track Scores`,
    description,
    // A page with zero published reports is thin content -- render normally
    // (no 404, the ticker itself is real) but keep it out of the index until
    // a first report gives it something to rank for.
    robots: hasCoverage ? undefined : { index: false, follow: true },
    alternates: {
      // One canonical URL per ticker on this exchange. Cross-listed symbols
      // (e.g. a TASE-listed twin of a US ticker) aren't in UNIVERSE today, so
      // there's no live duplicate-content pair to disambiguate yet -- this
      // still pins a stable canonical per page rather than leaving it unset.
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

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const sym = ticker.toUpperCase();
  const [snapshot, reports, filings, meta] = await Promise.all([
    getStockSnapshot(sym),
    listByTicker(sym),
    listFilings(sym, 6),
    getTickerRow(sym),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <StockQuoteHeader
        ticker={sym}
        name={meta?.name}
        sector={meta?.sector ?? undefined}
        snapshot={snapshot}
        reportCount={reports.length}
        metricsUpdatedAt={meta?.metrics_updated_at}
      />

      <StockKeyStats snapshot={snapshot} />
      <StockRangeBar snapshot={snapshot} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <MarketTradingViewChartCard ticker={sym} />
        <div className="flex flex-col gap-6">
          <FundamentalsPanel data={snapshot.fundamentals} />
          <CompanyNews ticker={sym} />
          <SectorPeers ticker={sym} sector={meta?.sector ?? undefined} />
        </div>
      </div>

      <Suspense fallback={<p className="t-meta">Loading financials...</p>}>
        <CompanyFinancials ticker={sym} filings={filings} />
      </Suspense>

      <section>
        <h2 className="t-h3 mb-4">Stoa coverage</h2>
        {reports.length > 0 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={`No Stoa coverage on ${sym} yet`}
            body="When an analyst publishes a call or report on this ticker, it will show up here."
          />
        )}
      </section>
    </div>
  );
}
