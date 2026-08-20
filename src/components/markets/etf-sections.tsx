import Link from "next/link";
import { Band } from "@/components/ui/band";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DayChange } from "@/components/markets/day-change";
import { FollowTicker } from "@/components/markets/follow-control";
import { compact, price } from "@/lib/format";
import type { EtfHolding, EtfSnapshot, SectorWeight } from "@/lib/markets/build-etf";

function Auto() {
  return <span className="auto-tag">Auto</span>;
}

function MetaItem({ label, value }: { label: string; value: string | null }) {
  if (value == null) return null;
  return (
    <span className="stock-meta-item">
      <span className="stock-meta-key">{label}</span>
      <span>{value}</span>
      <Auto />
    </span>
  );
}

/**
 * A fund's header carries fund facts, not company facts: there is no P/E, no
 * margin and no earnings on an ETF, so the stock meta row is replaced rather
 * than rendered with blanks.
 */
export function EtfHeader({ etf }: { etf: EtfSnapshot }) {
  const inceptionYear = etf.inceptionDate
    ? new Date(etf.inceptionDate).getUTCFullYear().toString()
    : null;

  return (
    <header>
      <Link href="/markets" className="markets-crumb focus-ring">
        <span aria-hidden>←</span> Markets
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="stock-name">{etf.name}</h1>
          <p className="stock-sub">
            {etf.symbol}
            {etf.exchange ? (
              <>
                <span aria-hidden> · </span>
                {etf.exchange}
              </>
            ) : null}
            <span aria-hidden> · </span>
            ETF
          </p>
        </div>

        <div className="flex items-end gap-4">
          <span className="stock-price">
            {etf.quote.price == null ? (
              <span className="markets-pending">No price</span>
            ) : (
              price(etf.quote.price)
            )}
          </span>
          {/* DAY-CHANGE-PENDING: the fund summary carries a real change, so a
              value renders when the provider returns one; the slot keeps its
              width either way. */}
          <DayChange percent={etf.changePercent} size="lg" />
          <FollowTicker ticker={etf.symbol} className="mb-1" />
        </div>
      </div>

      <div className="stock-meta">
        <MetaItem label="AUM" value={etf.aum == null ? null : compact(etf.aum)} />
        <MetaItem
          label="Expense ratio"
          value={etf.expenseRatio == null ? null : `${(etf.expenseRatio * 100).toFixed(2)}%`}
        />
        <MetaItem
          label="3-month avg volume"
          value={etf.averageVolume3Month == null ? null : compact(etf.averageVolume3Month)}
        />
        <MetaItem label="Inception" value={inceptionYear} />
      </div>
    </header>
  );
}

export function EtfHoldings({
  holdings,
  coverage,
}: {
  holdings: EtfHolding[];
  coverage: Record<string, number>;
}) {
  if (holdings.length === 0) return null;

  return (
    <Band
      title="Top holdings"
      note="Jump from the fund into the names Stoa actually covers."
    >
      <div className="mt-2">
        {holdings.slice(0, 8).map((h) => (
          <div key={h.symbol} className="markets-row">
            <Link href={`/markets/${h.symbol}`} className="markets-row-name focus-ring">
              <TickerChip ticker={h.symbol} />
              <span className="min-w-0 flex-1 truncate text-sm text-text">{h.company}</span>
            </Link>
            <span className="num text-[0.8125rem] font-semibold tabular-nums text-text">
              {h.weightPct.toFixed(2)}%
            </span>
            {/* DAY-CHANGE-PENDING: holdings come from the fund summary, which
                carries weights but no per-holding quote. */}
            <DayChange percent={null} />
            <span className="markets-row-meta num">
              {coverage[h.symbol] ?? 0} Stoa{" "}
              {(coverage[h.symbol] ?? 0) === 1 ? "publication" : "publications"}
            </span>
          </div>
        ))}
      </div>
    </Band>
  );
}

export function EtfSectorExposure({ weights }: { weights: SectorWeight[] }) {
  if (weights.length === 0) return null;

  const max = Math.max(...weights.map((w) => w.weightPct));

  return (
    <Band title="Sector exposure" note="What the fund is actually made of.">
      <div className="etf-exposure">
        {weights.map((w) => (
          <div key={w.sector} className="etf-exposure-row">
            <span className="etf-exposure-label">{w.sector}</span>
            <span className="etf-exposure-track" aria-hidden>
              <span
                className="etf-exposure-fill"
                style={{ width: `${Math.max(2, (w.weightPct / max) * 100)}%` }}
              />
            </span>
            <span className="num text-[0.75rem] tabular-nums text-text">
              {w.weightPct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </Band>
  );
}
