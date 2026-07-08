import { compact } from "@/lib/format";
import type { CompanyFundamentals } from "@/lib/engine/market";

function fmtPct(n: number | null) {
  if (n == null) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function compactUsd(n: number) {
  return `$${compact(n)}`;
}

export function FundamentalsPanel({ data }: { data: CompanyFundamentals }) {
  const hasLive =
    data.peRatio != null ||
    data.marketCap != null ||
    data.revenue != null ||
    data.eps != null;
  const hasFiling = data.latestFilingPeriod != null;

  if (!hasLive && !hasFiling) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
      <h2 className="t-h3 mb-4">Fundamentals</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.marketCap != null && (
          <Stat label="Market cap" value={compact(data.marketCap)} />
        )}
        {data.peRatio != null && (
          <Stat label="P/E (trailing)" value={data.peRatio.toFixed(1)} />
        )}
        {data.revenue != null && (
          <Stat label="Revenue (TTM)" value={compactUsd(data.revenue)} />
        )}
        {data.eps != null && <Stat label="EPS" value={`$${data.eps.toFixed(2)}`} />}
        {data.profitMargin != null && (
          <Stat label="Profit margin" value={fmtPct(data.profitMargin)} />
        )}
        {hasFiling && (
          <>
            <Stat label="Latest SEC filing" value={data.latestFilingPeriod!} />
            {data.latestRevenue != null && (
              <Stat label="Filing revenue" value={compactUsd(data.latestRevenue)} />
            )}
            {data.latestNetIncome != null && (
              <Stat label="Filing net income" value={compactUsd(data.latestNetIncome)} />
            )}
          </>
        )}
      </div>
      <p className="t-meta mt-4">
        Live metrics via Yahoo Finance
        {hasFiling ? "; SEC filings from Kaggle import" : ""}.
      </p>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="t-meta">{label}</div>
      <div className="num mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
