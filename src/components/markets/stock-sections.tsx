import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Band } from "@/components/ui/band";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DirectionTag, GradeTag } from "@/components/ui/tag";
import { DayChange } from "@/components/markets/day-change";
import { FollowTicker } from "@/components/markets/follow-control";
import { HeadlineRow, RowTag } from "@/components/today/headline-row";
import { accessLabel } from "@/lib/today/format";
import { compact, price } from "@/lib/format";
import type { OpenCall, ResolvedCall, StockCoverage } from "@/lib/markets/call-types";
import type { TodayItem } from "@/lib/today/types";
import type { TickerRow } from "@/lib/db/tickers";

/** Provenance mark: an automatically sourced market fact, not an estimate. */
function Auto() {
  return <span className="auto-tag">Auto</span>;
}

function MetaItem({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="stock-meta-item">
      <span className="stock-meta-key">{label}</span>
      {value == null ? <span className="markets-pending">Not available</span> : <span>{value}</span>}
      <Auto />
    </span>
  );
}

export function StockHeader({
  ticker,
  name,
  exchange,
  currentPrice,
  changePercent,
  marketCap,
  forwardPe,
  low52,
  high52,
}: {
  ticker: string;
  name: string;
  exchange: string | null;
  currentPrice: number | null;
  changePercent: number | null;
  marketCap: number | null;
  forwardPe: number | null;
  low52: number | null;
  high52: number | null;
}) {
  return (
    <header>
      <Link href="/markets" className="markets-crumb focus-ring">
        <span aria-hidden>←</span> Markets
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="stock-name">{name}</h1>
          <p className="stock-sub">
            {ticker}
            {exchange ? (
              <>
                <span aria-hidden> · </span>
                {exchange}
              </>
            ) : null}
          </p>
        </div>

        <div className="flex items-end gap-4">
          <span className="stock-price">
            {currentPrice == null ? (
              <span className="markets-pending">No price</span>
            ) : (
              price(currentPrice)
            )}
          </span>
          {/* DAY-CHANGE-PENDING: the single-symbol snapshot does carry a
              change, so a real value renders here when the provider returns
              one; otherwise the slot stays reserved at the same width. */}
          <DayChange percent={changePercent} size="lg" />
          <FollowTicker ticker={ticker} className="mb-1" />
        </div>
      </div>

      <div className="stock-meta">
        <MetaItem label="Market cap" value={marketCap == null ? null : compact(marketCap)} />
        <MetaItem label="Fwd P/E" value={forwardPe == null ? null : forwardPe.toFixed(1)} />
        <MetaItem
          label="52-week range"
          value={low52 == null || high52 == null ? null : `${price(low52)} - ${price(high52)}`}
        />
      </div>
    </header>
  );
}

/**
 * Coverage volume and the outcome record, never a house view. The long/short
 * split and the average target are gone on purpose: each analyst's position is
 * attributed by name in the open-calls list below, and blending them into one
 * number would save the reader from reading any of them.
 */
export function StockCoverageBlock({
  ticker,
  coverage,
}: {
  ticker: string;
  coverage: StockCoverage;
}) {
  if (coverage.openCount === 0 && coverage.resolvedCount === 0) return null;

  return (
    <Band
      title={`Stoa coverage of ${ticker}`}
      note="How much of Stoa is on this name, and how its closed calls turned out."
    >
      <div className="stock-consensus">
        <div>
          <p className="stock-consensus-figure">{coverage.openCount}</p>
          <p className="stock-consensus-key">
            Open {coverage.openCount === 1 ? "call" : "calls"}
          </p>
        </div>
        <div>
          <p className="stock-consensus-figure">{coverage.analystCount}</p>
          <p className="stock-consensus-key">
            {coverage.analystCount === 1 ? "Analyst covering" : "Analysts covering"}
          </p>
        </div>
        <div>
          <p className="stock-consensus-figure">
            {coverage.hitRatePct == null ? (
              <span className="markets-pending">No history</span>
            ) : (
              `${coverage.hitRatePct}%`
            )}
          </p>
          <p className="stock-consensus-key">
            Hit rate · {coverage.resolvedCount} resolved
          </p>
        </div>
      </div>
    </Band>
  );
}

export function StockOpenCalls({ calls }: { calls: OpenCall[] }) {
  if (calls.length === 0) return null;

  return (
    <Band
      title="Open calls"
      note="Every position, attributed by name. Locked at publication, graded by the market at the horizon."
    >
      <div className="mt-2">
        {calls.map((c) => (
          <div key={c.reportId} className="markets-row">
            <Link
              href={`/analyst/${c.analyst.handle}`}
              className="markets-row-name focus-ring"
            >
              <Avatar src={c.analyst.avatarUrl} name={c.analyst.displayName} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
                {c.analyst.displayName}
              </span>
            </Link>
            <DirectionTag direction={c.direction} />
            <span className="num text-[0.8125rem] tabular-nums text-text">
              {price(c.entryPrice)}
              <span aria-hidden className="text-text-faint"> → </span>
              {c.targetPrice == null ? "-" : price(c.targetPrice)}
            </span>
            <span className="markets-row-meta num">{c.daysLeft} days left</span>
            <Link
              href={`/report/${c.reportId}`}
              className="focus-ring ml-auto inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] text-sm font-medium text-accent hover:underline"
            >
              Read report
              <ArrowRight size={14} />
            </Link>
          </div>
        ))}
      </div>
    </Band>
  );
}

export function StockPublications({ items }: { items: TodayItem[] }) {
  if (items.length === 0) return null;

  return (
    <Band title="Publications on this name" seeAllHref="/explore">
      <div className="mt-2">
        {items.map((item) => (
          <HeadlineRow
            key={item.reportId}
            item={item}
            tag={
              <RowTag tone={item.access === "free" ? "quiet" : "outline"}>
                {accessLabel(item.access, item.price)}
              </RowTag>
            }
          />
        ))}
      </div>
    </Band>
  );
}

export function StockResolvedHistory({ calls }: { calls: ResolvedCall[] }) {
  if (calls.length === 0) return null;

  return (
    <Band title="Resolved history" note="What the market did with every call that has closed.">
      <div className="overflow-x-auto scroll-area">
        <table className="stock-table">
          <thead>
            <tr>
              <th>Analyst</th>
              <th>Direction</th>
              <th>Entry → resolved</th>
              <th>Return</th>
              <th>Outcome</th>
            </tr>
          </thead>
          <tbody>
            {calls.map((c) => (
              <tr key={c.reportId}>
                <td>
                  <Link
                    href={`/analyst/${c.analyst.handle}`}
                    className="focus-ring inline-flex items-center gap-2.5 rounded-[var(--radius-btn)]"
                  >
                    <span className="font-semibold">{c.analyst.displayName}</span>
                  </Link>
                </td>
                <td>
                  <DirectionTag direction={c.direction} />
                </td>
                <td className="num">
                  {price(c.entryPrice)}
                  <span aria-hidden className="text-text-faint"> → </span>
                  {c.exitPrice == null ? "-" : price(c.exitPrice)}
                </td>
                <td
                  className="num font-semibold"
                  style={{
                    color:
                      c.returnPct == null
                        ? "var(--text-mute)"
                        : c.returnPct >= 0
                          ? "var(--up)"
                          : "var(--down)",
                  }}
                >
                  {c.returnPct == null
                    ? "-"
                    : `${c.returnPct >= 0 ? "+" : ""}${c.returnPct.toFixed(1)}%`}
                </td>
                <td>
                  <GradeTag outcome={c.outcome} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Band>
  );
}

export function StockFundamentals({
  peRatio,
  marketCap,
  revenue,
  profitMargin,
  eps,
}: {
  peRatio: number | null;
  marketCap: number | null;
  revenue: number | null;
  profitMargin: number | null;
  eps: number | null;
}) {
  const rows: { key: string; value: string | null }[] = [
    { key: "P/E", value: peRatio == null ? null : peRatio.toFixed(1) },
    { key: "Market cap", value: marketCap == null ? null : compact(marketCap) },
    { key: "Revenue", value: revenue == null ? null : compact(revenue) },
    {
      key: "Profit margin",
      value: profitMargin == null ? null : `${(profitMargin * 100).toFixed(1)}%`,
    },
    { key: "EPS", value: eps == null ? null : eps.toFixed(2) },
  ];

  if (rows.every((r) => r.value == null)) return null;

  return (
    <Band title="Fundamentals" note="Pulled automatically, never an analyst's estimate.">
      <div className="stock-fundamentals">
        {rows.map((r) => (
          <div key={r.key}>
            <p className="stock-consensus-key">
              {r.key} <Auto />
            </p>
            <p className="num mt-1 text-base font-semibold tabular-nums text-text">
              {r.value ?? <span className="markets-pending">Not available</span>}
            </p>
          </div>
        ))}
      </div>
    </Band>
  );
}

export function StockPeers({
  peers,
  coverage,
}: {
  peers: TickerRow[];
  coverage: Record<string, number>;
}) {
  if (peers.length === 0) return null;

  return (
    <Band title="Peers" note="The rest of the sector.">
      <div className="stock-peers">
        {peers.map((p) => (
          <Link key={p.symbol} href={`/markets/${p.symbol}`} className="stock-peer focus-ring">
            <TickerChip ticker={p.symbol} />
            <p className="mt-2 truncate text-[0.8125rem] text-text">{p.name}</p>
            <div className="mt-1 flex items-baseline justify-between gap-2">
              <span className="num text-[0.8125rem] tabular-nums text-text">
                {p.last_price == null ? (
                  <span className="markets-pending">-</span>
                ) : (
                  price(p.last_price)
                )}
              </span>
              <DayChange percent={null} />
            </div>
            <p className="markets-row-meta num mt-2">
              {coverage[p.symbol] ?? 0} publications
            </p>
          </Link>
        ))}
      </div>
    </Band>
  );
}
