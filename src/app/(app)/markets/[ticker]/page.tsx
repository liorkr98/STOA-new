import type { Metadata } from "next";
import { Suspense } from "react";
import { price } from "@/lib/format";
import { getQuote, getCompanyFundamentals } from "@/lib/engine/market";
import { listByTicker } from "@/lib/db/reports";
import { UNIVERSE } from "@/lib/universe";
import { ReportCard } from "@/components/report-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StoaCoverageBadge } from "@/components/markets/coverage-badge";
import { FundamentalsPanel } from "@/components/markets/fundamentals-panel";
import { CompanyFinancials } from "@/components/markets/company-financials";
import { WatchlistButton } from "@/components/markets/watchlist-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  return { title: `${ticker.toUpperCase()} coverage` };
}

export default async function TickerPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const sym = ticker.toUpperCase();
  const [quote, reports, fundamentals] = await Promise.all([
    getQuote(sym),
    listByTicker(sym),
    getCompanyFundamentals(sym),
  ]);
  const meta = UNIVERSE.find((u) => u.ticker === sym);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <div className="flex items-start gap-2">
          <div>
            <h1 className="num t-display text-5xl">{sym}</h1>
            {meta && <p className="t-meta mt-1">{meta.name} · {meta.sector}</p>}
          </div>
          <WatchlistButton ticker={sym} className="mt-1 h-9 w-9" />
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="num text-3xl font-semibold">${price(quote.price)}</span>
          <StoaCoverageBadge count={reports.length} />
        </div>
      </div>

      <FundamentalsPanel data={fundamentals} />

      <Suspense fallback={<p className="t-meta">Loading financials...</p>}>
        <CompanyFinancials ticker={sym} />
      </Suspense>

      <div>
        <h2 className="t-h3 mb-4">Stoa coverage</h2>
        {reports.length > 0 ? (
          <div className="grid gap-5">
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
      </div>
    </div>
  );
}
