import Link from "next/link";
import { cn } from "@/lib/design/cn";
import { compact, pct, price } from "@/lib/format";
import type { StockSnapshot } from "@/lib/engine/market";
import { UNIVERSE } from "@/lib/universe";
import { WatchlistButton } from "@/components/markets/watchlist-button";

export function StockQuoteHeader({
  ticker,
  name,
  sector,
  snapshot,
  reportCount,
}: {
  ticker: string;
  name?: string;
  sector?: string;
  snapshot: StockSnapshot;
  reportCount: number;
}) {
  const { quote, change, changePercent } = snapshot;
  const up = (changePercent ?? 0) >= 0;
  const hasPrice = quote.available && quote.price != null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-3">
          <WatchlistButton ticker={ticker} className="mt-1 shrink-0" />
          <div>
            <h1 className="num t-display text-5xl">{ticker}</h1>
            {(name || sector) && (
              <p className="t-meta mt-1">
                {[name, sector].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          {hasPrice ? (
            <>
              <span className="num text-3xl font-semibold">${price(quote.price!)}</span>
              {changePercent != null && (
                <span
                  className={cn(
                    "num text-sm font-semibold",
                    up ? "text-[var(--verdigris)]" : "text-[var(--rust)]",
                  )}
                >
                  {change != null && `${change >= 0 ? "+" : ""}${change.toFixed(2)} `}
                  ({pct(changePercent)})
                </span>
              )}
            </>
          ) : (
            <span className="t-meta">Live quote unavailable</span>
          )}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="t-meta rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2 py-0.5 text-[11px]">
              {hasPrice ? `via ${quote.source}` : "check market hours / symbol"}
            </span>
            {reportCount > 0 && (
              <span className="t-meta rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2 py-0.5 text-[11px]">
                {reportCount} Stoa report{reportCount === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function StockKeyStats({ snapshot }: { snapshot: StockSnapshot }) {
  const { fundamentals, beta, dividendYield, forwardPe, recommendationKey, volume, avgVolume } =
    snapshot;
  const stats: { label: string; value: string }[] = [];

  if (fundamentals.marketCap != null) stats.push({ label: "Market cap", value: compact(fundamentals.marketCap) });
  if (fundamentals.peRatio != null) stats.push({ label: "P/E (TTM)", value: fundamentals.peRatio.toFixed(1) });
  if (forwardPe != null) stats.push({ label: "Forward P/E", value: forwardPe.toFixed(1) });
  if (fundamentals.eps != null) stats.push({ label: "EPS", value: `$${fundamentals.eps.toFixed(2)}` });
  if (fundamentals.revenue != null) stats.push({ label: "Revenue", value: `$${compact(fundamentals.revenue)}` });
  if (fundamentals.profitMargin != null) {
    stats.push({ label: "Profit margin", value: `${(fundamentals.profitMargin * 100).toFixed(1)}%` });
  }
  if (beta != null) stats.push({ label: "Beta", value: beta.toFixed(2) });
  if (dividendYield != null) stats.push({ label: "Div yield", value: `${(dividendYield * 100).toFixed(2)}%` });
  if (volume != null) stats.push({ label: "Volume", value: compact(volume) });
  if (avgVolume != null) stats.push({ label: "Avg volume", value: compact(avgVolume) });
  if (recommendationKey) stats.push({ label: "Analyst view", value: recommendationKey });

  if (stats.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="t-h3 mb-4">Key statistics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label}>
            <div className="t-meta">{s.label}</div>
            <div className="num mt-1 text-base font-semibold">{s.value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function StockRangeBar({ snapshot }: { snapshot: StockSnapshot }) {
  const { quote, dayLow, dayHigh, fiftyTwoWeekLow, fiftyTwoWeekHigh } = snapshot;
  if (!quote.available || quote.price == null) return null;
  if (dayLow == null && fiftyTwoWeekLow == null) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="t-h3 mb-4">Trading ranges</h2>
      <div className="grid gap-6 md:grid-cols-2">
        {dayLow != null && dayHigh != null && (
          <RangeRow label="Day range" low={dayLow} high={dayHigh} current={quote.price} />
        )}
        {fiftyTwoWeekLow != null && fiftyTwoWeekHigh != null && (
          <RangeRow
            label="52-week range"
            low={fiftyTwoWeekLow}
            high={fiftyTwoWeekHigh}
            current={quote.price}
          />
        )}
      </div>
    </section>
  );
}

function RangeRow({
  label,
  low,
  high,
  current,
}: {
  label: string;
  low: number;
  high: number;
  current: number;
}) {
  const span = high - low || 1;
  const pctPos = Math.min(100, Math.max(0, ((current - low) / span) * 100));

  return (
    <div>
      <div className="mb-2 flex justify-between text-xs text-text-mute">
        <span>{label}</span>
        <span className="num">
          ${low.toFixed(2)} to ${high.toFixed(2)}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-surface-2">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-accent bg-background"
          style={{ left: `${pctPos}%` }}
        />
      </div>
    </div>
  );
}

export function SectorPeers({
  ticker,
  sector,
}: {
  ticker: string;
  sector?: string;
}) {
  const peers = UNIVERSE.filter((u) => u.sector === sector && u.ticker !== ticker).slice(0, 6);
  if (!sector || peers.length === 0) return null;

  return (
    <section className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
      <h2 className="t-h3 mb-3">Peers in {sector}</h2>
      <div className="flex flex-wrap gap-2">
        {peers.map((p) => (
          <Link
            key={p.ticker}
            href={`/markets/${p.ticker}`}
            className="rounded-[var(--radius-tag)] border border-border bg-surface-2 px-3 py-1.5 text-sm transition-colors hover:border-border-strong hover:bg-accent/10"
          >
            <span className="num font-semibold">{p.ticker}</span>
            <span className="t-meta ml-2">{p.name}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
