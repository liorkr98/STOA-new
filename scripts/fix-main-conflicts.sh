#!/usr/bin/env bash
# One-shot fix for broken main after PR #41 merge (conflict markers in page.tsx + package-lock.json)
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

echo "→ Aborting any in-progress git operations..."
git cherry-pick --abort 2>/dev/null || true
git merge --abort 2>/dev/null || true
git rebase --abort 2>/dev/null || true

echo "→ Syncing main from GitHub..."
git checkout main
git fetch origin
git reset --hard origin/main

echo "→ Writing fixed markets/[ticker]/page.tsx..."
cat > "src/app/(app)/markets/[ticker]/page.tsx" << 'ENDOFFILE'
import type { Metadata } from "next";
import { Suspense } from "react";
import { getStockSnapshot } from "@/lib/engine/market";
import { listByTicker } from "@/lib/db/reports";
import { listFilings } from "@/lib/db/financials";
import { getTickerRow } from "@/lib/db/tickers";
import { publishedReportCount, hasResolvedHistory } from "@/lib/seo/ticker-coverage";
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
  const sym = ticker.toUpperCase();
  const row = await getTickerRow(sym);
  const name = row?.name ?? sym;

  const [reportCount, resolvedHistory] = await Promise.all([
    publishedReportCount(sym),
    hasResolvedHistory(sym),
  ]);
  const hasCoverage = reportCount > 0;

  const description = !hasCoverage
    ? `${name} (${sym}) on Stoa: independent analyst research with a permanent, publicly scored track record.`
    : resolvedHistory
      ? `Review ${name}'s verified analyst track record: locked calls, resolved outcomes, and public Track Scores on Stoa.`
      : `Locked, fact-checked research and price calls for ${name}. Track analyst Track Scores and theses on Stoa's permanent ledger.`;

  const ogImage = `/api/og/stock?ticker=${sym}`;

  return {
    title: `${name} (${sym}) · Analyst Ledger & Track Scores`,
    description,
    robots: hasCoverage ? undefined : { index: false, follow: true },
    alternates: { canonical: `/markets/${sym}` },
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
ENDOFFILE

echo "→ Fixing package-lock.json conflict markers..."
python3 << 'PY'
import re
from pathlib import Path
p = Path("package-lock.json")
text = p.read_text()
text = re.sub(r'<<<<<<< HEAD\n(.*?)\n=======\n.*?\n>>>>>>>[^\n]*\n', r'\1\n', text, flags=re.DOTALL)
p.write_text(text)
PY
npm install --silent

if [ -f supabase/migrations/0030_report_content_hash.sql ]; then
  echo "→ Renaming migration 0030 → 0038..."
  git mv supabase/migrations/0030_report_content_hash.sql supabase/migrations/0038_report_content_hash.sql
fi

echo "→ Building..."
npm run build

echo "→ Committing..."
git add .
git commit -m "fix: resolve merge conflict markers in page.tsx and package-lock.json; renumber content_hash to 0038"

echo ""
echo "✓ Done. Now push:"
echo "  git push origin main"
