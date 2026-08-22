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
import { BarChart2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { TickerChip } from "@/components/ui/ticker-chip";
import { CHART_RANGES, type Candle, type ChartRange } from "@/lib/market/candle-types";
import {
  parseAnnotations,
  parseVisibleRange,
  type ChartAnnotation,
  type ChartVisibleRange,
} from "@/lib/market/chart-annotations";
import {
  parseIndicators,
  INDICATOR_PRESETS,
  type ChartIndicator,
} from "@/lib/market/chart-indicators";
import {
  applyChartIndicators,
  createIndicatorHandles,
  type IndicatorHandles,
} from "@/lib/market/chart-indicator-render";
import { registerChart, unregisterChart } from "@/lib/editor/tiptap/nodes/chart-registry";
import { TradingViewChartPanel } from "@/components/editor/tiptap/nodes/trading-view-chart-panel";

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
  __indicatorHandles?: IndicatorHandles;
  __candles?: Candle[];
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
          title: ann.title ?? "",
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
 * Routes chartNode to TradingView Advanced Chart or Lightweight Charts.
 */
export function ChartNodeView(props: NodeViewProps) {
  const engine = String(props.node.attrs.engine ?? "lightweight");
  if (engine === "tradingview") {
    return <TradingViewChartPanel {...props} />;
  }
  return <LightweightChartNodeView {...props} />;
}

/**
 * Lightweight Charts (TradingView open source) — Stoa candle feed, annotations, indicators.
 */
function LightweightChartNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const range = (node.attrs.range ?? "3M") as ChartRange;
  const kind = (node.attrs.kind ?? "area") as ChartKind;
  const nodeId = String(node.attrs.nodeId ?? "");
  const screenshotUrl = node.attrs.screenshotUrl ? String(node.attrs.screenshotUrl) : null;
  const annotations = parseAnnotations(node.attrs.annotations);
  const indicators = parseIndicators(node.attrs.indicators);
  const sourceText = node.attrs.sourceText ? String(node.attrs.sourceText) : "";
  const savedVisibleRange = parseVisibleRange(node.attrs.visibleRange);
  const visibleRangeRef = useRef(savedVisibleRange);

  // Reading mode with a captured screenshot: show the PNG, never mount a live
  // chart (avoids an authed candle fetch for logged-out readers).
  const useScreenshot = !isEditable && !!screenshotUrl;
  const [imgFailed, setImgFailed] = useState(false);

  // The draft carries the ticker it was typed against, so switching charts
  // shows the new ticker without an effect copying the prop into state.
  const [draft, setDraft] = useState<{ forTicker: string; value: string } | null>(null);
  const draftTicker = draft?.forTicker === ticker ? draft.value : ticker;
  const [fetchStatus, setStatus] = useState<"loading" | "empty" | "auth" | "ready">("loading");
  // Idle is not a fetch outcome, it is "no ticker yet", so it is derived.
  const status = ticker ? fetchStatus : "idle";
  const [readout, setReadout] = useState<Readout | null>(null);
  const [drawMode, setDrawMode] = useState<DrawMode>("pan");
  const [trendDraft, setTrendDraft] = useState<TrendDraft | null>(null);
  const containerRef = useRef<ChartContainerEl>(null);
  const annotationsRef = useRef(annotations);
  const indicatorsRef = useRef(indicators);

  // These three mirror the node attributes for the chart's imperative
  // callbacks, which must not re-subscribe when a drawing changes. Written
  // after every commit rather than during render; the attrs are re-parsed each
  // render, so there is no stable dependency to key this on.
  useEffect(() => {
    visibleRangeRef.current = savedVisibleRange;
    annotationsRef.current = annotations;
    indicatorsRef.current = indicators;
  });

  const hasRsi = indicators.some((i) => i.type === "rsi");
  const chartHeight = hasRsi ? 332 : 260;

  // Assign a stable id once, so screenshot capture can find this chart at
  // publish time. Editable-only; a read-only editor can't updateAttributes.
  useEffect(() => {
    if (isEditable && !nodeId) updateAttributes({ nodeId: nanoid(10) });
  }, [isEditable, nodeId, updateAttributes]);

  // Register the screenshot capture for the publish flow (editor mode only).
  useEffect(() => {
    if (!isEditable || !nodeId) return;
    registerChart(nodeId, {
      getPos: () => (typeof getPos === "function" ? getPos() : undefined),
      takeScreenshot: () =>
        new Promise<Blob | null>((resolve) => {
          const chart = containerRef.current?.__lwChart;
          if (!chart) return resolve(null);
          try {
            const canvas = chart.takeScreenshot();
            canvas.toBlob((blob) => resolve(blob), "image/png");
          } catch {
            resolve(null);
          }
        }),
    });
    return () => unregisterChart(nodeId);
  }, [isEditable, nodeId, getPos]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !ticker || (useScreenshot && !imgFailed)) {
      return;
    }

    let disposed = false;
    let rangeTimer: ReturnType<typeof setTimeout> | null = null;
    const priceLines: IPriceLine[] = [];
    const trendSeries: ISeriesApi<"Line">[] = [];
    const indicatorHandles = createIndicatorHandles();
    el.__priceLines = priceLines;
    el.__trendSeries = trendSeries;
    el.__indicatorHandles = indicatorHandles;

    const ink = cssVar("--ink");
    const accent = cssVar("--verdigris");
    const up = cssVar("--verdigris");
    const down = cssVar("--rust");
    const grid = hexToRgba(ink, 0.08);
    const axis = hexToRgba(ink, 0.5);

    const chart = createChart(el, {
      width: el.clientWidth,
      height: chartHeight,
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
        el.__candles = candles;
        applyChartIndicators(chart, candles, indicatorsRef.current, indicatorHandles);
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

    if (isEditable) {
      chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
        if (!logicalRange || disposed) return;
        if (rangeTimer) clearTimeout(rangeTimer);
        rangeTimer = setTimeout(() => {
          updateAttributes({
            visibleRange: { from: logicalRange.from, to: logicalRange.to } satisfies ChartVisibleRange,
          });
        }, 200);
      });
    }

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
      delete el.__indicatorHandles;
      delete el.__candles;
      chart.remove();
    };
  }, [ticker, range, kind, chartHeight, updateAttributes, isEditable, useScreenshot, imgFailed]);

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

  // Re-apply SMA/RSI overlays when indicator attrs change.
  useEffect(() => {
    const el = containerRef.current;
    if (!el?.__lwChart || !el.__indicatorHandles || !el.__candles?.length || status !== "ready") {
      return;
    }
    applyChartIndicators(el.__lwChart, el.__candles, indicators, el.__indicatorHandles);
  }, [indicators, status]);

  function indicatorKey(ind: ChartIndicator): string {
    return ind.type === "sma" ? `sma-${ind.period}` : `rsi-${ind.period}`;
  }

  function hasIndicator(ind: ChartIndicator): boolean {
    return indicators.some((i) => indicatorKey(i) === indicatorKey(ind));
  }

  function toggleIndicator(ind: ChartIndicator) {
    const key = indicatorKey(ind);
    const next = hasIndicator(ind)
      ? indicators.filter((i) => indicatorKey(i) !== key)
      : [...indicators, ind];
    updateAttributes({ indicators: next });
  }

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

  const ariaLabel = isEditable
    ? `Price chart: ${ticker || "unconfigured"} ${range}. Use the configuration bar above to change settings.`
    : `Price chart for ${ticker} over ${range}`;

  // Reading mode with a captured screenshot: render the PNG, no live chart.
  if (useScreenshot && !imgFailed) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        role="figure"
        aria-label={`Price chart for ${ticker} over ${range}`}
        className="fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={screenshotUrl ?? ""}
          alt={`Price chart for ${ticker} over ${range}`}
          onError={() => setImgFailed(true)}
          className="block w-full"
        />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      role="figure"
      aria-label={ariaLabel}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stopEditorCapture}
      onClick={stopEditorCapture}
    >
      {isEditable && (
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-7 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2">
          <ChartCandlestick size={13} className="text-text-faint" />
          <input
            value={draftTicker}
            onChange={(e) => setDraft({ forTicker: ticker, value: e.target.value.toUpperCase() })}
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

        {INDICATOR_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            title={preset.label}
            onMouseDown={stopEditorCapture}
            onClick={() => toggleIndicator(preset.indicator)}
            className={cn(
              "rounded-[var(--radius-btn)] px-2 py-0.5 text-[10px] font-medium transition-colors focus-ring",
              hasIndicator(preset.indicator)
                ? "bg-accent-weak text-accent"
                : "text-text-faint hover:bg-surface-2 hover:text-text",
            )}
          >
            {preset.label}
          </button>
        ))}

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
      )}

      {ticker && (
        <div className="flex flex-wrap items-center gap-3 px-3 pt-2 text-[11px] text-text-mute">
          <TickerChip ticker={ticker} />
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
          aria-hidden="true"
          className={cn(
            "w-full",
            isEditable && drawMode !== "pan" && status === "ready" && "cursor-crosshair",
          )}
          style={{ height: chartHeight }}
          onPointerDown={isEditable ? handleChartPointerDown : undefined}
        />
        {status !== "ready" &&
          (!isEditable && (status === "empty" || status === "auth") ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <BarChart2 size={22} className="text-text-faint" style={{ color: "color-mix(in srgb, var(--ink) 50%, transparent)" }} />
              <p className="text-sm" style={{ color: "color-mix(in srgb, var(--ink) 50%, transparent)" }}>
                Chart unavailable
              </p>
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <p className="t-meta text-[12px]">{statusMessage}</p>
            </div>
          ))}
      </div>

      {sourceText && (
        <p className="border-t border-border px-3 py-2 text-[11px] leading-relaxed text-text-faint">
          <span className="t-eyebrow text-[10px] text-text-mute">From selection · </span>
          {sourceText.length > 220 ? `${sourceText.slice(0, 220)}…` : sourceText}
        </p>
      )}
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
