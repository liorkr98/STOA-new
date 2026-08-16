"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SealStamp } from "@/components/ui/seal-stamp";
import { price as fmtPrice } from "@/lib/format";
import type { Candle } from "@/lib/market/candle-types";
import type { OpenCall, ResolvedCall } from "@/lib/markets/call-types";
import {
  CUSTOM_RANGE,
  MAX_TARGET_LINES,
  STOCK_RANGES,
  overlayVisible,
} from "@/lib/markets/call-types";

const W = 880;
const H = 380;
const PAD = { top: 18, right: 96, bottom: 30, left: 10 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const THREE_MONTHS_MS = 92 * 86_400_000;
const MAX_SEALS = 6;

type Hover =
  | { kind: "target"; call: OpenCall; xPct: number; yPct: number }
  | { kind: "entry"; call: ResolvedCall; xPct: number; yPct: number }
  | null;

/**
 * The signature element: a price line with Stoa's calls drawn on it.
 *
 * Open calls become dashed target lines labelled at the right edge with the
 * analyst's initials and target. Only the five highest Track Scores draw as
 * lines; anything beyond that folds into a shaded consensus band so a widely
 * covered name stays readable. Resolved calls put an entry dot on the price
 * line at publication and a HIT/MISS seal where the market graded them.
 *
 * There are deliberately no per-entry text labels on the plot: detail belongs
 * to the open-calls list underneath, and the chart stays a picture rather than
 * a table.
 */
export function CallsChart({
  ticker,
  candles,
  openCalls,
  resolvedCalls,
  range,
  customFrom,
  customTo,
  maxTargetLines = MAX_TARGET_LINES,
  compact = false,
}: {
  ticker: string;
  candles: Candle[];
  openCalls: OpenCall[];
  resolvedCalls: ResolvedCall[];
  /** A preset key, or CUSTOM_RANGE when a from/to pair is in play. */
  range: string;
  customFrom?: string;
  customTo?: string;
  /** The sheet variant draws fewer lines in its smaller frame. */
  maxTargetLines?: number;
  compact?: boolean;
}) {
  const [hover, setHover] = useState<Hover>(null);
  const showOverlay = overlayVisible(range);
  const activeRange = range;

  // With the overlay off the price line must scale to the price alone, or a
  // far-off target would flatten a whole day's movement into a straight line.
  const geo = useMemo(
    () => buildGeometry(candles, showOverlay ? openCalls : []),
    [candles, openCalls, showOverlay],
  );

  if (!geo) {
    return (
      <div className="calls-chart">
        <p className="markets-empty">
          No price history available for {ticker} right now. The calls below are unaffected.
        </p>
      </div>
    );
  }

  const { x, y, linePath, minTime, maxTime } = geo;

  const withTargets = showOverlay ? openCalls.filter((c) => c.targetPrice != null) : [];
  const drawn = withTargets.slice(0, maxTargetLines);
  const overflow = withTargets.length - drawn.length;

  const bandTargets = withTargets.map((c) => c.targetPrice as number);
  const bandLow = overflow > 0 ? Math.min(...bandTargets) : null;
  const bandHigh = overflow > 0 ? Math.max(...bandTargets) : null;
  const bandAvg =
    overflow > 0 ? bandTargets.reduce((a, b) => a + b, 0) / bandTargets.length : null;

  // Seals thin out on long views so a busy name does not turn into a wall of
  // stamps: from 6M up only the last three months are stamped.
  const sealCutoff = range === "1M" || range === "1W" ? 0 : Date.now() - THREE_MONTHS_MS;
  const seals = !showOverlay
    ? []
    : resolvedCalls
        .filter((c) => new Date(c.resolvedAt).getTime() >= sealCutoff)
        .filter((c) => {
          const t = new Date(c.resolvedAt).getTime() / 1000;
          return t >= minTime && t <= maxTime;
        })
        .slice(0, MAX_SEALS);

  const entries = !showOverlay
    ? []
    : resolvedCalls.filter((c) => {
        const t = new Date(c.lockedAt).getTime() / 1000;
        return t >= minTime && t <= maxTime;
      });

  const ticks = dateTicks(minTime, maxTime, 5);

  return (
    <div className={compact ? "calls-chart calls-chart--compact" : "calls-chart"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-mute">
          {showOverlay
            ? "Analyst calls on this name, locked at publication."
            : "Intraday price."}
        </p>
        <TimeframePicker active={activeRange} from={customFrom} to={customTo} />
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "auto" }}
          role="img"
          aria-label={`${ticker} price with ${openCalls.length} open Stoa calls and ${resolvedCalls.length} resolved`}
        >
          {bandLow != null && bandHigh != null && (
            <>
              <rect
                x={PAD.left}
                y={y(bandHigh)}
                width={PLOT_W}
                height={Math.max(1, y(bandLow) - y(bandHigh))}
                fill="var(--accent-weak)"
              />
              {bandAvg != null && (
                <line
                  x1={PAD.left}
                  x2={PAD.left + PLOT_W}
                  y1={y(bandAvg)}
                  y2={y(bandAvg)}
                  stroke="var(--text-faint)"
                  strokeWidth={1}
                />
              )}
            </>
          )}

          {ticks.map((t) => (
            <text
              key={t.time}
              x={x(t.time)}
              y={H - 8}
              textAnchor="middle"
              fontFamily="var(--font-mono)"
              fontSize={10}
              fill="var(--text-faint)"
            >
              {t.label}
            </text>
          ))}

          <path d={linePath} fill="none" stroke="var(--ink)" strokeWidth={1.5} />

          {drawn.map((call) => {
            const ty = y(call.targetPrice as number);
            const color = call.direction === "short" ? "var(--down)" : "var(--up)";
            return (
              <g key={`t-${call.reportId}`}>
                <line
                  x1={PAD.left}
                  x2={PAD.left + PLOT_W}
                  y1={ty}
                  y2={ty}
                  stroke={color}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={PAD.left + PLOT_W + 6}
                  y={ty + 3.5}
                  fontFamily="var(--font-mono)"
                  fontSize={10}
                  fontWeight={600}
                  fill={color}
                >
                  {call.analyst.initials} → {fmtPrice(call.targetPrice as number)}
                </text>
                <line
                  x1={PAD.left}
                  x2={PAD.left + PLOT_W}
                  y1={ty}
                  y2={ty}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() =>
                    setHover({
                      kind: "target",
                      call,
                      xPct: 50,
                      yPct: (ty / H) * 100,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          {entries.map((call) => {
            const ex = x(new Date(call.lockedAt).getTime() / 1000);
            const ey = y(call.entryPrice);
            return (
              <circle
                key={`e-${call.reportId}`}
                cx={ex}
                cy={ey}
                r={4}
                fill="var(--paper)"
                stroke="var(--ink)"
                strokeWidth={1.5}
                style={{ pointerEvents: "all" }}
                onMouseEnter={() =>
                  setHover({
                    kind: "entry",
                    call,
                    xPct: (ex / W) * 100,
                    yPct: (ey / H) * 100,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          })}
        </svg>

        {seals.map((call) => {
          const sx = (x(new Date(call.resolvedAt).getTime() / 1000) / W) * 100;
          const sy = (y(call.exitPrice ?? call.entryPrice) / H) * 100;
          return (
            <span
              key={`s-${call.reportId}`}
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${sx}%`, top: `${sy}%` }}
            >
              <SealStamp
                status={call.outcome === "hit" ? "hit" : call.outcome === "miss" ? "miss" : "near"}
                date={new Date(call.resolvedAt)}
                size="sm"
                animateOnView
              />
            </span>
          );
        })}

        {hover && (
          <div
            className="calls-tooltip"
            style={{
              left: `${Math.min(78, Math.max(2, hover.xPct))}%`,
              top: `${Math.min(78, Math.max(2, hover.yPct))}%`,
            }}
          >
            <p className="font-semibold uppercase tracking-[0.1em]">
              {hover.call.analyst.displayName}
            </p>
            <p className="mt-1 text-text-mute">
              Score {hover.call.analyst.score ?? "-"} ·{" "}
              {hover.call.direction === "short" ? "Short" : "Long"}
            </p>
            <p className="mt-1 text-text-mute">Entry {fmtPrice(hover.call.entryPrice)}</p>
            {hover.kind === "target" ? (
              <>
                <p className="text-text-mute">
                  Target {hover.call.targetPrice ? fmtPrice(hover.call.targetPrice) : "-"}
                </p>
                <p className="text-text-mute">{hover.call.daysLeft} days left</p>
              </>
            ) : (
              <p className="text-text-mute">
                Resolved {hover.call.outcome} ·{" "}
                {hover.call.returnPct == null
                  ? "-"
                  : `${hover.call.returnPct >= 0 ? "+" : ""}${hover.call.returnPct.toFixed(1)}%`}
              </p>
            )}
          </div>
        )}
      </div>

      {!showOverlay ? (
        <div className="calls-chart-legend">
          <span className="calls-chart-legend-key">
            Analyst calls are shown from 1W and longer.
          </span>
        </div>
      ) : (
      <div className="calls-chart-legend">
        <span className="calls-chart-legend-key">
          <svg width="18" height="6" aria-hidden>
            <line x1="0" y1="3" x2="18" y2="3" stroke="var(--up)" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
          Open target
        </span>
        {overflow > 0 && (
          <span className="calls-chart-legend-key">
            <span
              aria-hidden
              className="inline-block h-2.5 w-4"
              style={{ background: "var(--accent-weak)" }}
            />
            Consensus band · +{overflow} more calls
          </span>
        )}
        <span className="calls-chart-legend-key">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
          </svg>
          Entry
        </span>
        <span className="calls-chart-legend-key">
          Resolved · {range === "1M" || range === "1W" ? "all in view" : "last 3 months"}
        </span>
      </div>
      )}
    </div>
  );
}

/**
 * Presets plus a genuine from/to range. The provider takes arbitrary
 * timestamps, so CUSTOM is the span the reader actually picked; nothing snaps
 * to a nearby preset.
 */
function TimeframePicker({
  active,
  from,
  to,
}: {
  active: string;
  from?: string;
  to?: string;
}) {
  const router = useRouter();
  const isCustom = active === CUSTOM_RANGE;
  const [open, setOpen] = useState(isCustom);
  const today = new Date().toISOString().slice(0, 10);
  const [fromValue, setFromValue] = useState(from ?? "");
  const [toValue, setToValue] = useState(to ?? today);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="calls-tf" role="group" aria-label="Chart timeframe">
        {STOCK_RANGES.map((r) => (
          <Link
            key={r}
            href={`?range=${r}`}
            scroll={false}
            aria-pressed={r === active}
            role="button"
            className="focus-ring"
          >
            {r}
          </Link>
        ))}
        <button
          type="button"
          aria-pressed={isCustom}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="focus-ring"
        >
          Custom
        </button>
      </div>

      {open && (
        <form
          className="calls-tf-custom"
          onSubmit={(e) => {
            e.preventDefault();
            if (!fromValue || !toValue) return;
            router.push(`?range=${CUSTOM_RANGE}&from=${fromValue}&to=${toValue}`, {
              scroll: false,
            });
          }}
        >
          <label>
            <span className="sr-only">From</span>
            <input
              type="date"
              value={fromValue}
              max={toValue || today}
              onChange={(e) => setFromValue(e.target.value)}
              required
            />
          </label>
          <span aria-hidden>→</span>
          <label>
            <span className="sr-only">To</span>
            <input
              type="date"
              value={toValue}
              min={fromValue || undefined}
              max={today}
              onChange={(e) => setToValue(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="focus-ring">
            Apply
          </button>
        </form>
      )}
    </div>
  );
}

function buildGeometry(candles: Candle[], openCalls: OpenCall[]) {
  if (candles.length < 2) return null;

  const minTime = candles[0].time;
  const maxTime = candles[candles.length - 1].time;
  if (maxTime <= minTime) return null;

  const closes = candles.map((c) => c.close);
  const targets = openCalls
    .map((c) => c.targetPrice)
    .filter((t): t is number => t != null);

  const lo = Math.min(...closes, ...targets);
  const hi = Math.max(...closes, ...targets);
  const pad = (hi - lo) * 0.08 || 1;
  const yLo = lo - pad;
  const yHi = hi + pad;

  const x = (time: number) =>
    PAD.left + ((time - minTime) / (maxTime - minTime)) * PLOT_W;
  const y = (value: number) =>
    PAD.top + (1 - (value - yLo) / (yHi - yLo)) * PLOT_H;

  const linePath = candles
    .map((c, i) => `${i === 0 ? "M" : "L"}${x(c.time).toFixed(2)},${y(c.close).toFixed(2)}`)
    .join(" ");

  return { x, y, linePath, minTime, maxTime };
}

/**
 * Tick labels follow the span: clock time inside a day, weekday across a week,
 * month and year once the view is long enough for the year to matter.
 */
function dateTicks(minTime: number, maxTime: number, count: number) {
  const spanDays = (maxTime - minTime) / 86_400;
  const fmt: Intl.DateTimeFormatOptions =
    spanDays <= 2
      ? { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }
      : spanDays <= 10
        ? { weekday: "short", timeZone: "America/New_York" }
        : { month: "short", year: "numeric", timeZone: "America/New_York" };

  const out: { time: number; label: string }[] = [];
  for (let i = 0; i < count; i++) {
    const time = minTime + ((maxTime - minTime) * i) / (count - 1);
    out.push({
      time,
      label: new Date(time * 1000).toLocaleString("en-US", fmt).toUpperCase(),
    });
  }
  return out;
}
