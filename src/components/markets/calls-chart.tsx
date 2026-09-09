"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketTradingViewChartCard } from "@/components/markets/market-tradingview-chart-card";
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
const PAD = { top: 18, right: 96, bottom: 30, left: 58 };
const PLOT_W = W - PAD.left - PAD.right;
const PLOT_H = H - PAD.top - PAD.bottom;

const THREE_MONTHS_MS = 92 * 86_400_000;
const MAX_MARKERS = 24;
const MARKER_PX = 14;
const MARKER_GAP = 4;

function verdictColor(outcome: ResolvedCall["outcome"]): string {
  if (outcome === "hit") return "var(--up)";
  if (outcome === "miss") return "var(--down)";
  return "var(--brass)";
}

function verdictLabel(outcome: ResolvedCall["outcome"]): string {
  if (outcome === "hit") return "HIT";
  if (outcome === "miss") return "MISS";
  return "NEAR";
}

/**
 * Push overlapping verdict dots apart.
 *
 * Calls on one instrument cluster: several resolve within days of each other,
 * near the same price, and the markers land on top of one another. Time (x) is
 * preserved; they fan along y. Measured in rendered pixels because the chart is a
 * scaled viewBox.
 */
function fanOutMarkers(
  points: { xPct: number; yPct: number }[],
  box: { w: number; h: number } | null,
): { xPct: number; yPct: number }[] {
  if (!box || box.w === 0 || box.h === 0) return points;
  const min = MARKER_PX + MARKER_GAP;
  const r = MARKER_PX / 2;
  const maxX = box.w * (1 - PAD.right / W) - r;
  const minX = box.w * (PAD.left / W) + r;
  const maxY = box.h - r;
  const minY = r;

  const placed: { x: number; y: number }[] = [];
  const free = (x: number, y: number) =>
    placed.every((q) => Math.hypot(q.x - x, q.y - y) >= min);

  return points.map((p) => {
    const x0 = (p.xPct / 100) * box.w;
    const y0 = (p.yPct / 100) * box.h;
    // Search outward from the true position and take the first clear seat that
    // is still inside the plot.
    let best = { x: x0, y: y0 };
    let found = free(x0, y0);
    for (let ring = 1; !found && ring <= 4; ring += 1) {
      for (let k = 0; k < 8; k += 1) {
        const a = (k / 8) * Math.PI * 2;
        const x = Math.min(Math.max(x0 + Math.cos(a) * min * ring, minX), maxX);
        const y = Math.min(Math.max(y0 + Math.sin(a) * min * ring, minY), maxY);
        if (free(x, y)) {
          best = { x, y };
          found = true;
          break;
        }
      }
    }
    best = {
      x: Math.min(Math.max(best.x, minX), maxX),
      y: Math.min(Math.max(best.y, minY), maxY),
    };
    placed.push(best);
    return { xPct: (best.x / box.w) * 100, yPct: (best.y / box.h) * 100 };
  });
}

type Hover =
  | { kind: "target"; call: OpenCall; xPct: number; yPct: number }
  | { kind: "entry"; call: ResolvedCall; xPct: number; yPct: number }
  | { kind: "verdict"; call: ResolvedCall; xPct: number; yPct: number }
  | { kind: "open-entry"; call: OpenCall; xPct: number; yPct: number }
  | null;

/**
 * Price tape from TradingView, with Stoa's calls as small event dots.
 *
 * Open calls become dashed target lines labelled at the right edge with the
 * analyst's initials and target. The five most recent draw as lines; anything
 * beyond that folds into a shaded range band, low to high, so a widely covered
 * name stays readable. The band is a spread, not an average. Resolved calls put
 * an entry dot at lock and a HIT / MISS / NEAR dot at resolution, Yahoo-style.
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
  // Pinned at mount rather than read during render: render has to be pure, and
  // a cutoff that drifts every frame would restamp the chart as time passes.
  const [mountedAt] = useState(() => Date.now());
  const showOverlay = overlayVisible(range);
  const activeRange = range;

  // With the overlay off the price line must scale to the price alone, or a
  // far-off target would flatten a whole day's movement into a straight line.
  const geo = useMemo(
    () => buildGeometry(candles, showOverlay ? openCalls : []),
    [candles, openCalls, showOverlay],
  );

  const plotRef = useRef<HTMLDivElement>(null);
  const [plotBox, setPlotBox] = useState<{ w: number; h: number } | null>(null);

  // The chart is a scaled viewBox, so marker spacing has to be decided against
  // the box as actually rendered rather than against viewBox units.
  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    setPlotBox({ w: el.clientWidth, h: el.clientHeight });
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setPlotBox({ w: r.width, h: r.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (!geo) {
    return (
      <div className={compact ? "calls-chart calls-chart--compact" : "calls-chart"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-mute">Tape from TradingView.</p>
          <TimeframePicker active={activeRange} from={customFrom} to={customTo} />
        </div>
        <div className="mt-4">
          <MarketTradingViewChartCard ticker={ticker} range={activeRange} compact={compact} />
        </div>
        <p className="markets-empty mt-4">
          No extra price history for the call dots right now. The calls below are unaffected.
        </p>
      </div>
    );
  }

  const { x, y, linePath, minTime, maxTime, yLo, yHi } = geo;

  const withTargets = showOverlay ? openCalls.filter((c) => c.targetPrice != null) : [];
  const drawn = withTargets.slice(0, maxTargetLines);
  const overflow = withTargets.length - drawn.length;

  const bandTargets = withTargets.map((c) => c.targetPrice as number);
  const bandLow = overflow > 0 ? Math.min(...bandTargets) : null;
  const bandHigh = overflow > 0 ? Math.max(...bandTargets) : null;

  // Dots thin out on long views so a busy name does not turn into a wall of
  // labels: from 6M up only the last three months are marked.
  const markerCutoff = range === "1M" || range === "1W" ? 0 : mountedAt - THREE_MONTHS_MS;
  const verdicts = !showOverlay
    ? []
    : resolvedCalls
        .filter((c) => new Date(c.resolvedAt).getTime() >= markerCutoff)
        .filter((c) => {
          const t = new Date(c.resolvedAt).getTime() / 1000;
          return t >= minTime && t <= maxTime;
        })
        .slice(0, MAX_MARKERS);

  const verdictSeats = fanOutMarkers(
    verdicts.map((call) => ({
      xPct: (x(new Date(call.resolvedAt).getTime() / 1000) / W) * 100,
      yPct: (y(call.exitPrice ?? call.entryPrice) / H) * 100,
    })),
    plotBox,
  );

  const entries = !showOverlay
    ? []
    : resolvedCalls.filter((c) => {
        const t = new Date(c.lockedAt).getTime() / 1000;
        return t >= minTime && t <= maxTime;
      });

  const openEntries = !showOverlay
    ? []
    : openCalls.filter((c) => {
        const t = new Date(c.lockedAt).getTime() / 1000;
        return t >= minTime && t <= maxTime;
      });

  const ticks = dateTicks(minTime, maxTime, compact ? 4 : 5);
  const priceLevels = priceTicks(yLo, yHi, compact ? 4 : 5);

  return (
    <div className={compact ? "calls-chart calls-chart--compact" : "calls-chart"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-mute">
          {showOverlay
            ? "TradingView tape. Stoa calls as dots on the record below."
            : "Intraday tape from TradingView."}
        </p>
        <TimeframePicker active={activeRange} from={customFrom} to={customTo} />
      </div>

      <div className="mt-4">
        <MarketTradingViewChartCard ticker={ticker} range={activeRange} compact={compact} />
      </div>

      {showOverlay && (
      <div ref={plotRef} className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: "auto" }}
          role="img"
          aria-label={`${ticker} price with ${openCalls.length} open Stoa calls and ${resolvedCalls.length} resolved`}
        >
          {bandLow != null && bandHigh != null && (
            <rect
              x={PAD.left}
              y={y(bandHigh)}
              width={PLOT_W}
              height={Math.max(1, y(bandLow) - y(bandHigh))}
              fill="var(--accent-weak)"
            />
          )}

          <g aria-hidden>
            {priceLevels.map((level) => (
              <line
                key={`gh-${level.value}`}
                x1={PAD.left}
                x2={PAD.left + PLOT_W}
                y1={y(level.value)}
                y2={y(level.value)}
                stroke="var(--border)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ))}
            {ticks.map((t) => (
              <line
                key={`gv-${t.time}`}
                x1={x(t.time)}
                x2={x(t.time)}
                y1={PAD.top}
                y2={PAD.top + PLOT_H}
                stroke="var(--border)"
                strokeWidth={1}
                shapeRendering="crispEdges"
              />
            ))}
            <line
              x1={PAD.left}
              x2={PAD.left + PLOT_W}
              y1={PAD.top + PLOT_H}
              y2={PAD.top + PLOT_H}
              stroke="var(--border-strong)"
              strokeWidth={1}
              shapeRendering="crispEdges"
            />
          </g>

          {priceLevels.map((level) => (
            <text
              key={`py-${level.value}`}
              x={PAD.left - 8}
              y={y(level.value) + 3.5}
              textAnchor="end"
              fontFamily="var(--font-mono)"
              fontSize={10}
              fill="var(--text-faint)"
            >
              {level.label}
            </text>
          ))}

          {ticks.map((t, i) => (
            <text
              key={t.time}
              x={x(t.time)}
              y={H - 8}
              textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
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

          {openEntries.map((call) => {
            const ex = x(new Date(call.lockedAt).getTime() / 1000);
            const ey = y(call.entryPrice);
            const color = call.direction === "short" ? "var(--down)" : "var(--up)";
            return (
              <circle
                key={`oe-${call.reportId}`}
                cx={ex}
                cy={ey}
                r={3.5}
                fill={color}
                stroke="var(--paper)"
                strokeWidth={1.5}
                style={{ pointerEvents: "all" }}
                onMouseEnter={() =>
                  setHover({
                    kind: "open-entry",
                    call,
                    xPct: (ex / W) * 100,
                    yPct: (ey / H) * 100,
                  })
                }
                onMouseLeave={() => setHover(null)}
              />
            );
          })}

          {entries.map((call) => {
            const ex = x(new Date(call.lockedAt).getTime() / 1000);
            const ey = y(call.entryPrice);
            const vx = x(new Date(call.resolvedAt).getTime() / 1000);
            const vy = y(call.exitPrice ?? call.entryPrice);
            const color = verdictColor(call.outcome);
            return (
              <g key={`e-${call.reportId}`}>
                <line
                  x1={ex}
                  y1={ey}
                  x2={vx}
                  y2={vy}
                  stroke={color}
                  strokeWidth={1}
                  strokeOpacity={0.45}
                />
                <circle
                  cx={ex}
                  cy={ey}
                  r={3.5}
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
              </g>
            );
          })}

          {verdicts.map((call, i) => {
            const seat = verdictSeats[i];
            const vx = (seat.xPct / 100) * W;
            const vy = (seat.yPct / 100) * H;
            const color = verdictColor(call.outcome);
            const label = verdictLabel(call.outcome);
            return (
              <g key={`v-${call.reportId}`}>
                <line
                  x1={vx}
                  y1={vy}
                  x2={vx}
                  y2={vy - 11}
                  stroke={color}
                  strokeWidth={1}
                />
                <circle
                  cx={vx}
                  cy={vy}
                  r={4.5}
                  fill={color}
                  stroke="var(--paper)"
                  strokeWidth={1.5}
                  style={{ pointerEvents: "all" }}
                  onMouseEnter={() =>
                    setHover({
                      kind: "verdict",
                      call,
                      xPct: seat.xPct,
                      yPct: seat.yPct,
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
                <text
                  x={vx}
                  y={vy - 14}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={9}
                  fontWeight={600}
                  letterSpacing="0.08em"
                  fill={color}
                >
                  {label}
                </text>
              </g>
            );
          })}
        </svg>

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
              {hover.call.direction === "short" ? "Short" : "Long"}
            </p>
            <p className="mt-1 text-text-mute">Entry {fmtPrice(hover.call.entryPrice)}</p>
            {hover.kind === "target" || hover.kind === "open-entry" ? (
              <>
                <p className="text-text-mute">
                  Target {hover.call.targetPrice ? fmtPrice(hover.call.targetPrice) : "-"}
                </p>
                <p className="text-text-mute">{hover.call.daysLeft} days left</p>
              </>
            ) : (
              <p className="text-text-mute">
                {verdictLabel(hover.call.outcome)}
                {hover.call.returnPct == null
                  ? ""
                  : ` · ${hover.call.returnPct >= 0 ? "+" : ""}${hover.call.returnPct.toFixed(1)}%`}
              </p>
            )}
          </div>
        )}
      </div>

      )}

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
            Target range · +{overflow} more calls
          </span>
        )}
        <span className="calls-chart-legend-key">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
          </svg>
          Entry
        </span>
        <span className="calls-chart-legend-key">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="var(--up)" stroke="var(--paper)" strokeWidth="1.5" />
          </svg>
          HIT
        </span>
        <span className="calls-chart-legend-key">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="var(--down)" stroke="var(--paper)" strokeWidth="1.5" />
          </svg>
          MISS
        </span>
        <span className="calls-chart-legend-key">
          <svg width="10" height="10" aria-hidden>
            <circle cx="5" cy="5" r="3.5" fill="var(--brass)" stroke="var(--paper)" strokeWidth="1.5" />
          </svg>
          NEAR
        </span>
        <span className="calls-chart-legend-key">
          {range === "1M" || range === "1W" ? "All in view" : "Last 3 months"}
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

  return { x, y, linePath, minTime, maxTime, yLo, yHi };
}

/**
 * Round price levels for the value axis. Steps land on 1 / 2 / 2.5 / 5 of a
 * power of ten so a reader can take a price off the chart without arithmetic,
 * and the decimals follow the step rather than the price: a name moving in
 * whole dollars gets no cents, a sub-dollar name gets two.
 */
function priceTicks(yLo: number, yHi: number, count: number) {
  const span = yHi - yLo;
  if (!Number.isFinite(span) || span <= 0) return [];

  const raw = span / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const step =
    magnitude * (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10);

  const decimals = step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  const format = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  const out: { value: number; label: string }[] = [];
  const first = Math.ceil(yLo / step) * step;
  for (let v = first; v <= yHi + step / 1000; v += step) {
    const value = Math.round(v / step) * step;
    out.push({ value, label: format.format(value) });
  }
  return out;
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
