"use client";

import { useEffect, useRef, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import {
  createChart,
  LineSeries,
  ColorType,
  CrosshairMode,
  PriceScaleMode,
  type IChartApi,
  type ISeriesApi,
} from "lightweight-charts";
import { Trash2, Plus, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { CHART_RANGES, type Candle, type ChartRange } from "@/lib/market/candle-types";
import { registerChart, unregisterChart } from "@/lib/editor/tiptap/nodes/chart-registry";

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

interface CompareContainerEl extends HTMLDivElement {
  __lwChart?: IChartApi;
}

interface Legend {
  ticker: string;
  color: string;
  pct: number | null;
}

/**
 * Compare mode (Phase 2.3): 2-4 tickers on one chart, each a line series with
 * the price scale in percentage mode so all series rebase to 0% at the left of
 * the visible range -- the correct way to compare NVDA vs AMD or SPY vs an ETF.
 * Series colors: verdigris, plum, brass, ink@60%. Legend chips toggle series
 * visibility. Until the multi-symbol candles endpoint lands (Phase 2.4) we
 * fetch per symbol in parallel.
 */
export function CompareChartView({
  tickers,
  range,
  isEditable,
  nodeId,
  getPos,
  selected,
  onRange,
  onTickers,
  onDelete,
}: {
  tickers: string[];
  range: ChartRange;
  isEditable: boolean;
  nodeId: string;
  getPos: () => number | undefined;
  selected: boolean;
  onRange: (r: ChartRange) => void;
  onTickers: (t: string[]) => void;
  onDelete: () => void;
}) {
  const containerRef = useRef<CompareContainerEl>(null);
  const [status, setStatus] = useState<"loading" | "empty" | "auth" | "ready">("loading");
  const [legend, setLegend] = useState<Legend[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const tickerKey = tickers.join(",");

  // Screenshot registration (editor mode only), shared with single-chart nodes.
  useEffect(() => {
    if (!isEditable || !nodeId) return;
    registerChart(nodeId, {
      getPos,
      takeScreenshot: () =>
        new Promise<Blob | null>((resolve) => {
          const chart = containerRef.current?.__lwChart;
          if (!chart) return resolve(null);
          try {
            chart.takeScreenshot().toBlob((b) => resolve(b), "image/png");
          } catch {
            resolve(null);
          }
        }),
    });
    return () => unregisterChart(nodeId);
  }, [isEditable, nodeId, getPos]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let disposed = false;

    const ink = cssVar("--ink");
    const colors = [cssVar("--verdigris"), cssVar("--plum"), cssVar("--brass"), hexToRgba(ink, 0.6)];

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 260,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: hexToRgba(ink, 0.5),
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: hexToRgba(ink, 0.08) } },
      rightPriceScale: { borderVisible: false, mode: PriceScaleMode.Percentage },
      timeScale: { borderVisible: false },
      crosshair: { mode: CrosshairMode.Magnet },
    });
    el.__lwChart = chart;

    setStatus("loading");
    Promise.all(
      tickers.map((t) =>
        fetch(`/api/market/candles?symbol=${encodeURIComponent(t)}&range=${range}`)
          .then((r) => (r.status === 401 ? { auth: true } : r.ok ? r.json() : { candles: [] }))
          .then((j: { candles?: Candle[]; auth?: boolean }) => ({ t, candles: j.candles ?? [], auth: !!j.auth }))
          .catch(() => ({ t, candles: [] as Candle[], auth: false })),
      ),
    ).then((results) => {
      if (disposed) return;
      if (results.some((r) => r.auth)) {
        setStatus("auth");
        return;
      }
      const nextLegend: Legend[] = [];
      let any = false;
      results.forEach((res, i) => {
        const color = colors[i % colors.length];
        const points = res.candles.map((c) => ({ time: c.time, value: c.close }));
        if (points.length) {
          any = true;
          const s: ISeriesApi<"Line"> = chart.addSeries(LineSeries, {
            color,
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: false,
            visible: !hidden.has(res.t),
          });
          s.setData(points as never);
          const first = points[0].value;
          const last = points[points.length - 1].value;
          nextLegend.push({ ticker: res.t, color, pct: first > 0 ? ((last - first) / first) * 100 : null });
        } else {
          nextLegend.push({ ticker: res.t, color, pct: null });
        }
      });
      setLegend(nextLegend);
      if (any) {
        chart.timeScale().fitContent();
        setStatus("ready");
      } else {
        setStatus("empty");
      }
    });

    const ro = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    ro.observe(el);
    return () => {
      disposed = true;
      ro.disconnect();
      delete el.__lwChart;
      chart.remove();
    };
    // tickerKey is the stable proxy for the tickers array (avoids identity churn).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickerKey, range, hidden]);

  function toggle(ticker: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(ticker)) next.delete(ticker);
      else next.add(ticker);
      return next;
    });
  }

  function addTicker() {
    const t = draft.trim().toUpperCase();
    setDraft("");
    if (!t || tickers.includes(t) || tickers.length >= 4) return;
    onTickers([...tickers, t]);
  }

  function removeTicker(t: string) {
    onTickers(tickers.filter((x) => x !== t));
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      role="figure"
      aria-label={`Comparison chart: ${tickers.join(", ")} over ${range}`}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
    >
      {isEditable && (
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {tickers.map((t, i) => (
              <span
                key={t}
                className="num flex h-7 items-center gap-1 rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm font-semibold"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 rounded-full"
                  style={{ background: [cssVar("--verdigris"), cssVar("--plum"), cssVar("--brass"), hexToRgba(cssVar("--ink"), 0.6)][i % 4] }}
                />
                {t}
                {tickers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => removeTicker(t)}
                    className="text-text-faint transition-colors hover:text-[var(--down)]"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
            {tickers.length < 4 && (
              <span className="flex h-7 items-center rounded-[var(--radius-btn)] border border-dashed border-border-strong px-1.5">
                <Plus size={12} className="text-text-faint" />
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTicker())}
                  onBlur={addTicker}
                  placeholder="Add"
                  className="num w-14 bg-transparent px-1 text-sm focus:outline-none placeholder:text-text-faint"
                />
              </span>
            )}
          </div>

          <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5">
            {CHART_RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRange(r)}
                className={cn(
                  "rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors",
                  r === range ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            aria-label="Delete chart"
            onClick={onDelete}
            className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint transition-colors hover:text-[var(--down)] focus-ring"
          >
            <Trash2 size={15} />
          </button>
        </div>
      )}

      {/* Legend chips: click toggles a series (Phase 2.3). */}
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2 text-[11px]">
        {legend.map((l) => (
          <button
            key={l.ticker}
            type="button"
            onClick={() => toggle(l.ticker)}
            className={cn(
              "num flex items-center gap-1.5 rounded-[var(--radius-btn)] px-1.5 py-0.5 transition-opacity",
              hidden.has(l.ticker) && "opacity-40",
            )}
          >
            <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: l.color }} />
            <span className="font-semibold text-text">{l.ticker}</span>
            {l.pct != null && (
              <span style={{ color: l.pct >= 0 ? "var(--up)" : "var(--down)" }}>
                {l.pct >= 0 ? "+" : ""}
                {l.pct.toFixed(1)}%
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="relative px-1 pb-2">
        <div ref={containerRef} aria-hidden="true" className="h-[260px] w-full" />
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="t-meta text-[12px]">
              {status === "loading"
                ? "Loading price data..."
                : status === "auth"
                  ? "Sign in to load live chart data"
                  : "No price data for these tickers"}
            </p>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
