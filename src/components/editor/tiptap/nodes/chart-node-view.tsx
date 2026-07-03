"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
} from "lightweight-charts";
import { Trash2, ChartCandlestick } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { CHART_RANGES, type Candle, type ChartRange } from "@/lib/market/candle-types";

type ChartKind = "candles" | "line" | "area";
const KINDS: { key: ChartKind; label: string }[] = [
  { key: "area", label: "Area" },
  { key: "line", label: "Line" },
  { key: "candles", label: "Candles" },
];

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

interface Readout {
  o?: number;
  h?: number;
  l?: number;
  c: number;
}

/**
 * A live price chart as a real document node (chartNode). Lightweight Charts
 * (TradingView, open source) rendered client-side, fed by /api/market/candles
 * so the provider key stays server-side. Up/down candle color is the one
 * sanctioned use of verdigris/rust here -- direction IS the chart's semantic
 * content, not incidental UI.
 */
export function ChartNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const ticker = String(node.attrs.ticker ?? "");
  const range = (node.attrs.range ?? "3M") as ChartRange;
  const kind = (node.attrs.kind ?? "area") as ChartKind;

  const [draftTicker, setDraftTicker] = useState(ticker);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "ready">(
    ticker ? "loading" : "idle",
  );
  const [readout, setReadout] = useState<Readout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => setDraftTicker(ticker), [ticker]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ticker) return;

    let disposed = false;
    let chart: IChartApi | null = null;
    let series: ISeriesApi<SeriesType> | null = null;

    const ink = cssVar("--ink");
    const up = cssVar("--verdigris");
    const down = cssVar("--rust");
    const grid = hexToRgba(ink, 0.08);
    const axis = hexToRgba(ink, 0.5);

    chart = createChart(el, {
      width: el.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: axis,
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: grid } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: range === "1D" || range === "1W" },
      crosshair: { mode: CrosshairMode.Magnet },
      handleScale: false,
      handleScroll: false,
    });

    if (kind === "candles") {
      series = chart.addSeries(CandlestickSeries, {
        upColor: up,
        downColor: down,
        borderVisible: false,
        wickUpColor: up,
        wickDownColor: down,
      });
    } else if (kind === "line") {
      series = chart.addSeries(LineSeries, { color: up, lineWidth: 2 });
    } else {
      series = chart.addSeries(AreaSeries, {
        lineColor: up,
        topColor: hexToRgba(up, 0.22),
        bottomColor: hexToRgba(up, 0.02),
        lineWidth: 2,
      });
    }

    setStatus("loading");
    fetch(`/api/market/candles?symbol=${encodeURIComponent(ticker)}&range=${range}`)
      .then((r) => r.json())
      .then(({ candles }: { candles: Candle[] }) => {
        if (disposed || !series) return;
        if (!candles?.length) {
          setStatus("empty");
          return;
        }
        if (kind === "candles") {
          series.setData(candles as never);
        } else {
          series.setData(candles.map((c) => ({ time: c.time, value: c.close })) as never);
        }
        chart?.timeScale().fitContent();
        setStatus("ready");
      })
      .catch(() => !disposed && setStatus("empty"));

    const activeSeries = series;
    chart.subscribeCrosshairMove((param) => {
      const d = activeSeries ? param.seriesData.get(activeSeries) : undefined;
      if (!d) {
        setReadout(null);
        return;
      }
      const bar = d as Partial<Record<"open" | "high" | "low" | "close" | "value", number>>;
      if (typeof bar.close === "number") {
        setReadout({ o: bar.open, h: bar.high, l: bar.low, c: bar.close });
      } else if (typeof bar.value === "number") {
        setReadout({ c: bar.value });
      }
    });

    const ro = new ResizeObserver(() => chart?.applyOptions({ width: el.clientWidth }));
    ro.observe(el);

    return () => {
      disposed = true;
      ro.disconnect();
      chart?.remove();
    };
  }, [ticker, range, kind]);

  function commitTicker() {
    const t = draftTicker.trim().toUpperCase();
    if (t !== ticker) updateAttributes({ ticker: t });
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "my-4 select-none overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
    >
      {/* Config row */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-7 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2">
          <ChartCandlestick size={13} className="text-text-faint" />
          <input
            value={draftTicker}
            onChange={(e) => setDraftTicker(e.target.value.toUpperCase())}
            onBlur={commitTicker}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitTicker())}
            placeholder="Ticker"
            className="num w-16 bg-transparent text-sm font-semibold focus:outline-none"
          />
        </span>

        <Segmented
          value={range}
          options={CHART_RANGES.map((r) => ({ key: r, label: r }))}
          onChange={(r) => updateAttributes({ range: r })}
        />
        <Segmented
          value={kind}
          options={KINDS}
          onChange={(k) => updateAttributes({ kind: k })}
        />

        <button
          type="button"
          aria-label="Delete chart"
          onClick={() => deleteNode()}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {/* Readout */}
      {ticker && (
        <div className="flex items-center gap-3 px-3 pt-2 text-[11px] text-text-mute">
          <span className="num font-semibold text-text">{ticker}</span>
          {readout ? (
            readout.o != null ? (
              <span className="num flex gap-2">
                <span>O {readout.o.toFixed(2)}</span>
                <span>H {readout.h?.toFixed(2)}</span>
                <span>L {readout.l?.toFixed(2)}</span>
                <span className="text-text">C {readout.c.toFixed(2)}</span>
              </span>
            ) : (
              <span className="num text-text">{readout.c.toFixed(2)}</span>
            )
          ) : (
            <span className="t-meta text-[11px]">Hover for price</span>
          )}
        </div>
      )}

      {/* Chart / states */}
      <div className="relative px-1 pb-2">
        <div ref={containerRef} className="h-[260px] w-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="t-meta text-[12px]">
              {status === "idle"
                ? "Enter a ticker to load the chart"
                : status === "loading"
                  ? "Loading price data..."
                  : "No price data for this ticker"}
            </p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors",
            value === o.key ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
