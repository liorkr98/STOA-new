import Link from "next/link";
import type { Metadata } from "next";
import { price } from "@/lib/format";
import { UNIVERSE } from "@/lib/universe";
import { getQuote } from "@/lib/engine/market";
import { tickerCoverage } from "@/lib/db/reports";
import { StoaCoverageBadge } from "@/components/markets/coverage-badge";

export const metadata: Metadata = { title: "Markets" };

export default async function MarketsPage() {
  const coverage = await tickerCoverage();
  const rows = await Promise.all(
    UNIVERSE.map(async (u) => ({ ...u, quote: await getQuote(u.ticker), cover: coverage[u.ticker] ?? 0 })),
  );
  rows.sort((a, b) => b.cover - a.cover);
  const anyMock = rows.some((r) => r.quote.mock);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="t-h1">Markets</h1>
        <p className="t-body mt-1">
          Browse tickers and see how much verified Stoa research covers each one.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Link
            key={r.ticker}
            href={`/markets/${r.ticker}`}
            className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-[transform,border-color] hover:-translate-y-0.5 hover:border-border-strong"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="num text-lg font-semibold">{r.ticker}</div>
                <div className="t-meta">{r.name}</div>
              </div>
              <div className="text-right">
                <div className="num text-lg font-semibold">${price(r.quote.price)}</div>
                <div className="t-meta">{r.sector}</div>
              </div>
            </div>
            <StoaCoverageBadge count={r.cover} />
          </Link>
        ))}
      </div>

      {anyMock && (
        <p className="t-meta">
          Some prices could not be fetched live and are simulated. Yahoo Finance is the default
          feed; optional fallback keys: TWELVE_DATA_API_KEY, ALPHA_VANTAGE_API_KEY.
        </p>
      )}
    </div>
  );
}
