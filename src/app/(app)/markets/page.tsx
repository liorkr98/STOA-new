import Link from "next/link";
import type { Metadata } from "next";
import { compact, price } from "@/lib/format";
import { listMarketTickers } from "@/lib/db/tickers";
import { tickerCoverage } from "@/lib/db/reports";
import { capBandLabel, type CapBand } from "@/lib/market/cap-bands";
import { StoaCoverageBadge } from "@/components/markets/coverage-badge";
import { WatchlistButton } from "@/components/markets/watchlist-button";
import { formatDistanceToNow } from "date-fns";

export const metadata: Metadata = { title: "Markets" };

const PAGE_SIZE = 48;

function freshnessLabel(iso: string | null): string {
  if (!iso) return "Prices not refreshed yet — first hourly update pending.";
  try {
    return `Prices & market cap updated ${formatDistanceToNow(new Date(iso), { addSuffix: true })} (hourly cron).`;
  } catch {
    return "Prices & market cap refresh hourly.";
  }
}

export default async function MarketsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; cap?: string }>;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const search = params.q?.trim() || undefined;
  const capBand = (["mega", "large", "mid", "small"] as const).includes(params.cap as CapBand)
    ? (params.cap as CapBand)
    : undefined;

  const [{ rows, total, metricsUpdatedAt }, coverage] = await Promise.all([
    listMarketTickers({ page, limit: PAGE_SIZE, search, capBand, sort: "market_cap" }),
    tickerCoverage(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = new URLSearchParams();
  if (search) query.set("q", search);
  if (capBand) query.set("cap", capBand);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="t-h1">Markets</h1>
        <p className="t-body mt-1">
          Browse {total.toLocaleString()} US tickers. Cached prices and market cap refresh hourly;
          ticker pages still fetch a live quote on load.
        </p>
        <p className="t-meta mt-2">{freshnessLabel(metricsUpdatedAt)}</p>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/markets" method="get">
        <label className="flex flex-col gap-1">
          <span className="t-meta">Search</span>
          <input
            name="q"
            defaultValue={search ?? ""}
            placeholder="Symbol or company"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="t-meta">Market cap</span>
          <select
            name="cap"
            defaultValue={capBand ?? ""}
            className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="mega">{capBandLabel("mega")}</option>
            <option value="large">{capBandLabel("large")}</option>
            <option value="mid">{capBandLabel("mid")}</option>
            <option value="small">{capBandLabel("small")}</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Filter
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <Link
            key={r.symbol}
            href={`/markets/${r.symbol}`}
            className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-colors hover:border-border-strong"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="num text-lg font-semibold">{r.symbol}</div>
                <div className="t-meta line-clamp-2">{r.name}</div>
              </div>
              <div className="flex items-start gap-1">
                <div className="text-right">
                  <div className="num text-lg font-semibold">
                    {r.last_price != null ? `$${price(r.last_price)}` : "—"}
                  </div>
                  <div className="t-meta">
                    {r.market_cap != null ? compact(r.market_cap) : r.exchange}
                  </div>
                </div>
                <WatchlistButton ticker={r.symbol} className="-mr-2 -mt-1" />
              </div>
            </div>
            <StoaCoverageBadge count={coverage[r.symbol] ?? 0} />
          </Link>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="t-meta">No tickers match your filters.</p>
      )}

      {totalPages > 1 && (
        <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
          {page > 1 && (
            <Link
              href={`/markets?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page - 1) }).toString()}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Previous
            </Link>
          )}
          <span className="t-meta px-2">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/markets?${new URLSearchParams({ ...Object.fromEntries(query), page: String(page + 1) }).toString()}`}
              className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
