"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChartCandlestick } from "lucide-react";
import {
  AreaSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  LineType,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type MouseEventParams,
  type SeriesMarker,
  type UTCTimestamp,
} from "lightweight-charts";
import { MarketTradingViewChartCard } from "@/components/markets/market-tradingview-chart-card";
import { cn } from "@/lib/design/cn";
import { price as fmtPrice } from "@/lib/format";
import type { Candle } from "@/lib/market/candle-types";
import type { OpenCall, ResolvedCall } from "@/lib/markets/call-types";
import {
  CUSTOM_RANGE,
  STOCK_RANGES,
  overlayVisible,
} from "@/lib/markets/call-types";
import {
  buildTapeMarkers,
  periodChangePct,
  type MarkerTone,
} from "@/lib/markets/chart-markers";

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "").trim();
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return hex;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

type Hover = {
  x: number;
  y: number;
  width: number;
  date: string;
  close: string;
  open: string;
  high: string;
  low: string;
  events: { label: string; analyst: string }[];
} | null;

/**
 * Markets tape: TradingView Lightweight Charts, drawn like Yahoo Finance.
 *
 * One area chart, quiet horizontal grid, last price on the right, small event
 * dots for HIT / MISS / NEAR. Open targets are not drawn as full-width dashed
 * lines: several analysts near the same price used to pile initials on top
 * of each other. The Advanced chart button opens TradingView's widget.
 */
export function CallsChart({
  ticker,
  candles,
  openCalls,
  resolvedCalls,
  range,
  customFrom,
  customTo,
  compact = false,
}: {
  ticker: string;
  candles: Candle[];
  openCalls: OpenCall[];
  resolvedCalls: ResolvedCall[];
  range: string;
  customFrom?: string;
  customTo?: string;
  maxTargetLines?: number;
  compact?: boolean;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [advanced, setAdvanced] = useState(false);
  const [hover, setHover] = useState<Hover>(null);
  const showCalls = overlayVisible(range);
  const changePct = periodChangePct(candles);
  const rising = (changePct ?? 0) >= 0;

  const { markers, eventsByTime } = useMemo(
    () => buildTapeMarkers(candles, openCalls, resolvedCalls, showCalls),
    [candles, openCalls, resolvedCalls, showCalls],
  );

  const candleByTime = useMemo(() => {
    const map = new Map<number, Candle>();
    for (const c of candles) map.set(c.time, c);
    return map;
  }, [candles]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || candles.length < 2) return;

    const ink = cssVar("--ink") || "#14171f";
    const paper = cssVar("--paper") || "#faf8f4";
    const up = cssVar("--verdigris") || "#2f6e5d";
    const down = cssVar("--rust") || "#a6483c";
    const brass = cssVar("--brass") || "#855f22";
    const grid = cssVar("--border") || "rgba(20,23,31,0.12)";
    const muted = cssVar("--text-faint") || "rgba(20,23,31,0.45)";
    const stroke = rising ? up : down;
    const tones: Record<MarkerTone, string> = { up, down, brass, ink };

    const chart: IChartApi = createChart(host, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: paper },
        textColor: muted,
        attributionLogo: true,
        fontFamily: "IBM Plex Mono, ui-monospace, monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: grid, style: LineStyle.Solid },
      },
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: withAlpha(ink, 0.28), width: 1, style: LineStyle.Dashed, labelVisible: false },
        horzLine: { color: withAlpha(ink, 0.2), width: 1, style: LineStyle.Dashed, labelVisible: true },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.08, bottom: 0.12 },
      },
      leftPriceScale: { visible: false },
      timeScale: {
        borderVisible: false,
        timeVisible: range === "1D" || range === "1W",
      },
      handleScroll: !compact,
      handleScale: !compact,
    });

    const area = chart.addSeries(AreaSeries, {
      lineColor: stroke,
      topColor: withAlpha(stroke, 0.28),
      bottomColor: withAlpha(stroke, 0),
      lineWidth: 2,
      lineType: range === "1D" ? LineType.Simple : LineType.Curved,
      priceLineVisible: true,
      priceLineColor: withAlpha(ink, 0.45),
      priceLineStyle: LineStyle.Dashed,
      priceLineWidth: 1,
      lastValueVisible: true,
      crosshairMarkerRadius: 4,
      priceFormat: { type: "price", precision: 2, minMove: 0.01 },
    });
    area.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));

    const plugin = createSeriesMarkers(
      area,
      markers.map(
        (m): SeriesMarker<UTCTimestamp> => ({
          time: m.time as UTCTimestamp,
          position: m.position,
          color: tones[m.tone],
          shape: "circle",
          text: m.text,
          size: m.size,
        }),
      ),
    );

    chart.timeScale().fitContent();

    const onMove = (param: MouseEventParams) => {
      if (!param.point || param.time == null) {
        setHover(null);
        return;
      }
      const t = typeof param.time === "number" ? param.time : null;
      if (t == null) {
        setHover(null);
        return;
      }
      const bar = candleByTime.get(t);
      if (!bar) {
        setHover(null);
        return;
      }
      const events = eventsByTime.get(t) ?? [];
      setHover({
        x: param.point.x,
        y: param.point.y,
        width: host.clientWidth,
        date: new Date(t * 1000).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "America/New_York",
        }),
        close: fmtPrice(bar.close),
        open: fmtPrice(bar.open),
        high: fmtPrice(bar.high),
        low: fmtPrice(bar.low),
        events: events.map((e) => ({ label: e.label, analyst: e.analyst })),
      });
    };
    chart.subscribeCrosshairMove(onMove);

    return () => {
      chart.unsubscribeCrosshairMove(onMove);
      plugin.detach();
      chart.remove();
    };
  }, [candles, compact, range, rising, markers, candleByTime, eventsByTime]);

  if (candles.length < 2) {
    return (
      <div className={compact ? "calls-chart calls-chart--compact" : "calls-chart"}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-text-mute">No tape for {ticker} right now.</p>
          <TimeframePicker active={range} from={customFrom} to={customTo} />
        </div>
      </div>
    );
  }

  return (
    <div className={compact ? "calls-chart calls-chart--compact" : "calls-chart"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-mute">
          {changePct == null ? (
            "Price on this name."
          ) : (
            <>
              This range{" "}
              <span className={cn("num", rising ? "text-[var(--up)]" : "text-[var(--down)]")}>
                {rising ? "+" : ""}
                {changePct.toFixed(1)}%
              </span>
            </>
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!compact ? (
            <button
              type="button"
              aria-pressed={advanced}
              onClick={() => setAdvanced((v) => !v)}
              className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 py-1 text-[11px] text-text-mute hover:border-border-strong hover:text-text"
            >
              <ChartCandlestick size={13} aria-hidden />
              Advanced
            </button>
          ) : null}
          <TimeframePicker active={range} from={customFrom} to={customTo} />
        </div>
      </div>

      {advanced && !compact ? (
        <div className="mt-4">
          <MarketTradingViewChartCard ticker={ticker} range={range} />
        </div>
      ) : (
      <div className="relative mt-4">
        <div
          ref={hostRef}
          className="calls-tape"
          style={{ height: compact ? 220 : 380 }}
          role="img"
          aria-label={`${ticker} price with ${openCalls.length} open Stoa calls and ${resolvedCalls.length} resolved`}
        />
        {hover ? (
          <div
            className="calls-tooltip"
            style={{
              left: `${Math.min(hover.width - 12, Math.max(8, hover.x + 12))}px`,
              top: `${Math.max(8, hover.y + 12)}px`,
            }}
          >
            <p className="font-semibold">{hover.date}</p>
            <p className="mt-1 text-text-mute">Close {hover.close}</p>
            <p className="text-text-mute">
              Open {hover.open} · High {hover.high} · Low {hover.low}
            </p>
            {hover.events.map((e, i) => (
              <p key={`${e.analyst}-${e.label}-${i}`} className="mt-1 text-text">
                {e.label}
                {e.label ? " · " : ""}
                {e.analyst}
              </p>
            ))}
          </div>
        ) : null}
      </div>
      )}

      {!showCalls ? (
        <div className="calls-chart-legend">
          <span className="calls-chart-legend-key">Calls are marked from 1W and longer.</span>
        </div>
      ) : (
        <div className="calls-chart-legend">
          <span className="calls-chart-legend-key">
            <svg width="10" height="10" aria-hidden>
              <circle cx="5" cy="5" r="3.5" fill="var(--up)" />
            </svg>
            HIT
          </span>
          <span className="calls-chart-legend-key">
            <svg width="10" height="10" aria-hidden>
              <circle cx="5" cy="5" r="3.5" fill="var(--down)" />
            </svg>
            MISS
          </span>
          <span className="calls-chart-legend-key">
            <svg width="10" height="10" aria-hidden>
              <circle cx="5" cy="5" r="3.5" fill="var(--brass)" />
            </svg>
            NEAR
          </span>
          <span className="calls-chart-legend-key">
            <svg width="10" height="10" aria-hidden>
              <circle cx="5" cy="5" r="3.5" fill="var(--paper)" stroke="var(--ink)" strokeWidth="1.5" />
            </svg>
            Open call
          </span>
        </div>
      )}
    </div>
  );
}

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
