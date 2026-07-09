import type { Metadata } from "next";
import { Suspense } from "react";
import { getStockSnapshot } from "@/lib/engine/market";
import { listByTicker } from "@/lib/db/reports";
import { listFilings } from "@/lib/db/financials";
import { UNIVERSE } from "@/lib/universe";
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
  const meta = UNIVERSE.find((u) => u.ticker === ticker.toUpperCase());
  return {
    title: meta ? `${meta.name} (${ticker.toUpperCase()})` : `${ticker.toUpperCase()} research`,
  };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const sym = ticker.toUpperCase();
  const [snapshot, reports, filings] = await Promise.all([
    getStockSnapshot(sym),
    listByTicker(sym),
    listFilings(sym, 6),
  ]);
  const meta = UNIVERSE.find((u) => u.ticker === sym);

  return (
    <div className="flex flex-col gap-8">
      <StockQuoteHeader
        ticker={sym}
        name={meta?.name}
        sector={meta?.sector}
        snapshot={snapshot}
        reportCount={reports.length}
      />

      <StockKeyStats snapshot={snapshot} />
      <StockRangeBar snapshot={snapshot} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <MarketTradingViewChartCard ticker={sym} />
        <div className="flex flex-col gap-6">
          <FundamentalsPanel data={snapshot.fundamentals} />
          <CompanyNews ticker={sym} />
          <SectorPeers ticker={sym} sector={meta?.sector} />
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
