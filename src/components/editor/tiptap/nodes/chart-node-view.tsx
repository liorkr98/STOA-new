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
  type IPriceLine,
  type ISeriesApi,
  type SeriesType,
  type UTCTimestamp,
} from "lightweight-charts";
import { Trash2, ChartCandlestick, MousePointer2, Minus, TrendingUp, Eraser } from "lucide-react";
import { nanoid } from "nanoid";
import { cn } from "@/lib/design/cn";
import { CHART_RANGES, type Candle, type ChartRange } from "@/lib/market/candle-types";
import {
  parseAnnotations,
  parseVisibleRange,
  type ChartAnnotation,
  type ChartVisibleRange,
} from "@/lib/market/chart-annotations";

type ChartKind = "candles" | "line" | "area";
type DrawMode = "pan" | "hline" | "trend";

const KINDS: { key: ChartKind; label: string }[] = [
  { key: "area", label: "Area" },
  { key: "line", label: "Line" },
  { key: "candles", label: "Candles" },
];

const DRAW_TOOLS: { key: DrawMode; label: string; icon: typeof MousePointer2 }[] = [
  { key: "pan", label: "Pan", icon: MousePointer2 },
  { key: "hline", label: "Level", icon: Minus },
  { key: "trend", label: "Trend", icon: TrendingUp },
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

interface TrendDraft {
  t: number;
  p: number;
}

interface ChartContainerEl extends HTMLDivElement {
  __lwChart?: IChartApi;
  __lwSeries?: ISeriesApi<SeriesType>;
  __priceLines?: IPriceLine[];
  __trendSeries?: ISeriesApi<"Line">[];
}

function stopEditorCapture(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function timeToUnix(time: unknown): number | null {
  if (typeof time === "number") return time;
  if (time && typeof time === "object" && "timestamp" in time) {
    const ts = (time as { timestamp?: number }).timestamp;
    return typeof ts === "number" ? ts : null;
  }
  return null;
}

function applyAnnotations(
  chart: IChartApi,
  series: ISeriesApi<SeriesType>,
  items: ChartAnnotation[],
  priceLines: IPriceLine[],
  trendSeries: ISeriesApi<"Line">[],
  accent: string,
) {
  for (const line of priceLines) series.removePriceLine(line);
  priceLines.length = 0;
  for (const s of trendSeries) chart.removeSeries(s);
  trendSeries.length = 0;

  for (const ann of items) {
    if (ann.kind === "hline") {
      priceLines.push(
        series.createPriceLine({
          price: ann.price,
          color: accent,
          lineWidth: 1,
          lineStyle: 2,
          axisLabelVisible: true,
        }),
      );
    } else {
      const trend = chart.addSeries(LineSeries, {
        color: accent,
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
        crosshairMarkerVisible: false,
      });
      trend.setData([
        { time: ann.t1 as UTCTimestamp, value: ann.p1 },
        { time: ann.t2 as UTCTimestamp, value: ann.p2 },
      ]);
      trendSeries.push(trend);
    }
  }
}

/**
 * A live price chart as a real document node (chartNode). Lightweight Charts
 * (TradingView, open source) rendered client-side, fed by /api/market/candles
 * so the provider key stays server-side. Analysts can pan/zoom and add
 * horizontal levels or trend segments; overlays persist in node attrs.
 */
export function ChartNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const ticker = String(node.attrs.ticker ?? "");
  const range = (node.attrs.range ?? "3M") as ChartRange;
  const kind = (node.attrs.kind ?? "area") as ChartKind;
  const annotations = parseAnnotations(node.attrs.annotations);
  const savedVisibleRange = parseVisibleRange(node.attrs.visibleRange);
  const visibleRangeRef = useRef(savedVisibleRange);
  visibleRangeRef.current = savedVisibleRange;

  const [draftTicker, setDraftTicker] = useState(ticker);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "auth" | "ready">(
    ticker ? "loading" : "idle",
  );
  const [readout, setReadout] = useState<Readout | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("pan");
  const [trendDraft, setTrendDraft] = useState<TrendDraft | null>(null);
  const containerRef = useRef<ChartContainerEl>(null);
  const annotationsRef = useRef(annotations);
  annotationsRef.current = annotations;

  useEffect(() => setDraftTicker(ticker), [ticker]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ticker) {
      setStatus("idle");
      return;
    }

    let disposed = false;
    let rangeTimer: ReturnType<typeof setTimeout> | null = null;
    const priceLines: IPriceLine[] = [];
    const trendSeries: ISeriesApi<"Line">[] = [];
    el.__priceLines = priceLines;
    el.__trendSeries = trendSeries;

    const ink = cssVar("--ink");
    const accent = cssVar("--verdigris");
    const up = cssVar("--verdigris");
    const down = cssVar("--rust");
    const grid = hexToRgba(ink, 0.08);
    const axis = hexToRgba(ink, 0.5);

    const chart = createChart(el, {
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
      handleScale: true,
      handleScroll: true,
    });

    let series: ISeriesApi<SeriesType>;
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

    el.__lwChart = chart;
    el.__lwSeries = series;

    setStatus("loading");
    fetch(`/api/market/candles?symbol=${encodeURIComponent(ticker)}&range=${range}`)
      .then(async (r) => {
        if (r.status === 401) {
          setStatus("auth");
          return null;
        }
        if (!r.ok) {
          setStatus("empty");
          return null;
        }
        return r.json() as Promise<{ candles: Candle[] }>;
      })
      .then((payload) => {
        if (disposed) return;
        const candles = payload?.candles;
        if (!candles?.length) {
          if (payload !== null) setStatus("empty");
          return;
        }
        if (kind === "candles") {
          series.setData(candles as never);
        } else {
          series.setData(candles.map((c) => ({ time: c.time, value: c.close })) as never);
        }
        if (visibleRangeRef.current) {
          chart.timeScale().setVisibleLogicalRange(visibleRangeRef.current);
        } else {
          chart.timeScale().fitContent();
        }
        applyAnnotations(chart, series, annotationsRef.current, priceLines, trendSeries, accent);
        setStatus("ready");
      })
      .catch(() => !disposed && setStatus("empty"));

    chart.subscribeCrosshairMove((param) => {
      const d = param.seriesData.get(series);
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

    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (!logicalRange || disposed) return;
      if (rangeTimer) clearTimeout(rangeTimer);
      rangeTimer = setTimeout(() => {
        updateAttributes({
          visibleRange: { from: logicalRange.from, to: logicalRange.to } satisfies ChartVisibleRange,
        });
      }, 200);
    });

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);

    return () => {
      disposed = true;
      if (rangeTimer) clearTimeout(rangeTimer);
      ro.disconnect();
      delete el.__lwChart;
      delete el.__lwSeries;
      delete el.__priceLines;
      delete el.__trendSeries;
      chart.remove();
    };
  }, [ticker, range, kind, updateAttributes]);

  useEffect(() => {
    const chart = containerRef.current?.__lwChart;
    if (!chart) return;
    const pan = drawMode === "pan";
    chart.applyOptions({ handleScale: pan, handleScroll: pan });
  }, [drawMode]);

  // Re-draw overlays when annotations change without rebuilding candles.
  useEffect(() => {
    const el = containerRef.current;
    if (!el?.__lwChart || !el.__lwSeries || !el.__priceLines || !el.__trendSeries || status !== "ready") {
      return;
    }
    applyAnnotations(
      el.__lwChart,
      el.__lwSeries,
      annotations,
      el.__priceLines,
      el.__trendSeries,
      cssVar("--verdigris"),
    );
    setTrendDraft(null);
  }, [annotations, status]);

  function commitTicker() {
    const t = draftTicker.trim().toUpperCase();
    if (t !== ticker) updateAttributes({ ticker: t });
  }

  function addAnnotation(ann: ChartAnnotation) {
    updateAttributes({ annotations: [...annotations, ann] });
  }

  function clearAnnotations() {
    updateAttributes({ annotations: [] });
    setTrendDraft(null);
  }

  function handleChartPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    stopEditorCapture(e);
    if (drawMode === "pan" || status !== "ready") return;

    const el = containerRef.current;
    const chart = el?.__lwChart;
    const series = el?.__lwSeries;
    if (!el || !chart || !series) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const time = chart.timeScale().coordinateToTime(x);
    const price = series.coordinateToPrice(y);
    const t = timeToUnix(time);
    if (t == null || price == null) return;

    e.preventDefault();

    if (drawMode === "hline") {
      addAnnotation({ id: nanoid(8), kind: "hline", price });
      return;
    }

    if (!trendDraft) {
      setTrendDraft({ t, p: price });
      return;
    }
    addAnnotation({
      id: nanoid(8),
      kind: "trend",
      t1: trendDraft.t,
      p1: trendDraft.p,
      t2: t,
      p2: price,
    });
    setTrendDraft(null);
  }

  const statusMessage =
    status === "idle"
      ? "Enter a ticker to load the chart"
      : status === "loading"
        ? "Loading price data..."
        : status === "auth"
          ? "Sign in to load live chart data"
          : "No price data for this ticker";

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stopEditorCapture}
      onClick={stopEditorCapture}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-7 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2">
          <ChartCandlestick size={13} className="text-text-faint" />
          <input
            value={draftTicker}
            onChange={(e) => setDraftTicker(e.target.value.toUpperCase())}
            onBlur={commitTicker}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitTicker())}
            onMouseDown={stopEditorCapture}
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

        <div className="hidden h-4 w-px bg-border sm:block" />

        <div className="flex items-center gap-0.5">
          {DRAW_TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.key}
                type="button"
                title={tool.label}
                aria-label={tool.label}
                onMouseDown={stopEditorCapture}
                onClick={() => {
                  setDrawMode(tool.key);
                  if (tool.key !== "trend") setTrendDraft(null);
                }}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] transition-colors focus-ring",
                  drawMode === tool.key
                    ? "bg-[var(--ink)] text-[var(--paper)]"
                    : "text-text-faint hover:bg-surface-2 hover:text-text",
                )}
              >
                <Icon size={14} />
              </button>
            );
          })}
          {annotations.length > 0 && (
            <button
              type="button"
              title="Clear lines"
              aria-label="Clear lines"
              onMouseDown={stopEditorCapture}
              onClick={clearAnnotations}
              className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:text-[var(--down)] focus-ring"
            >
              <Eraser size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Delete chart"
          onMouseDown={stopEditorCapture}
          onClick={() => deleteNode()}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {ticker && (
        <div className="flex flex-wrap items-center gap-3 px-3 pt-2 text-[11px] text-text-mute">
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
          {drawMode === "hline" && status === "ready" && (
            <span className="t-meta text-[11px] text-accent">Click chart to add a level</span>
          )}
          {drawMode === "trend" && status === "ready" && (
            <span className="t-meta text-[11px] text-accent">
              {trendDraft ? "Click second point" : "Click first point"}
            </span>
          )}
        </div>
      )}

      <div className="relative px-1 pb-2">
        <div
          ref={containerRef}
          className={cn("h-[260px] w-full", drawMode !== "pan" && status === "ready" && "cursor-crosshair")}
          onPointerDown={handleChartPointerDown}
        />
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="t-meta text-[12px]">{statusMessage}</p>
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
          onClick={(e) => {
            e.stopPropagation();
            onChange(o.key);
          }}
          onMouseDown={stopEditorCapture}
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
