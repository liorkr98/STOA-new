"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  LineSeries,
  ColorType,
  CrosshairMode,
  type IChartApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { cn } from "@/lib/design/cn";

type SparkPoint = { t: number; v: number };

interface SparkBody {
  ticker?: string;
  points?: number[];
  series?: SparkPoint[];
  compare?: { ticker: string; points: number[]; series: SparkPoint[] } | null;
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function toSeries(body: SparkBody | null): SparkPoint[] {
  if (body?.series && body.series.length >= 2) return body.series;
  const points = body?.points ?? [];
  if (points.length < 2) return [];
  const now = Math.floor(Date.now() / 1000);
  return points.map((v, i) => ({ t: now - (points.length - 1 - i) * 86_400, v }));
}

/**
 * Evidence-card tape. Rendering is TradingView Lightweight Charts.
 * Prices come from Yahoo Finance via /api/market/sparkline. No widget picker.
 */
export function CardChart({
  ticker,
  compareTicker,
  caption,
  compact = false,
  className,
}: {
  ticker: string;
  compareTicker?: string;
  caption?: string;
  compact?: boolean;
  className?: string;
}) {
  const symbol = ticker.trim().toUpperCase();
  const compare = compareTicker?.trim().toUpperCase() ?? "";
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "empty">(symbol ? "loading" : "empty");
  const [changePct, setChangePct] = useState<number | null>(null);

  useEffect(() => {
    if (!symbol) return;
    const host = hostRef.current;
    if (!host) return;

    let ignore = false;
    let chart: IChartApi | null = null;
    const ac = new AbortController();

    const q = new URLSearchParams({ ticker: symbol });
    if (compare && compare !== symbol) q.set("compare", compare);

    fetch(`/api/market/sparkline?${q.toString()}`, { signal: ac.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: SparkBody | null) => {
        if (ignore || !host) return;
        const primary = toSeries(body);
        if (primary.length < 2) {
          setStatus("empty");
          return;
        }
        const first = primary[0].v;
        const last = primary[primary.length - 1].v;
        setChangePct(first ? ((last - first) / first) * 100 : 0);

        const ink = cssVar("--ink") || "#14171F";
        const paper = cssVar("--paper") || "#FAF8F4";
        const up = cssVar("--up") || cssVar("--verdigris") || "#2F6F5E";
        const down = cssVar("--down") || cssVar("--rust") || "#8C3A32";
        const brass = cssVar("--brass") || "#A6843A";
        const grid = cssVar("--border") || "rgba(20,23,31,0.12)";
        const muted = cssVar("--text-faint") || "rgba(20,23,31,0.45)";
        const rising = last >= first;
        const stroke = rising ? up : down;

        chart = createChart(host, {
          autoSize: true,
          layout: {
            background: { type: ColorType.Solid, color: paper },
            textColor: muted,
            attributionLogo: true,
            fontFamily: "IBM Plex Sans, sans-serif",
          },
          grid: {
            vertLines: { color: grid },
            horzLines: { color: grid },
          },
          crosshair: { mode: CrosshairMode.Magnet },
          rightPriceScale: { borderColor: grid },
          timeScale: { borderColor: grid, timeVisible: false },
          handleScroll: false,
          handleScale: false,
        });

        const area = chart.addSeries(AreaSeries, {
          lineColor: stroke,
          topColor: `${stroke}33`,
          bottomColor: `${stroke}00`,
          lineWidth: 2,
          priceLineColor: ink,
        });
        area.setData(primary.map((p) => ({ time: p.t as UTCTimestamp, value: p.v })));

        const compareSeries = toSeries(body?.compare ?? null);
        if (compareSeries.length >= 2) {
          const line = chart.addSeries(LineSeries, {
            color: brass,
            lineWidth: 2,
            priceScaleId: "compare",
          });
          chart.priceScale("compare").applyOptions({ visible: false });
          line.setData(compareSeries.map((p) => ({ time: p.t as UTCTimestamp, value: p.v })));
        }

        chart.timeScale().fitContent();
        setStatus("ready");
      })
      .catch(() => {
        if (!ignore) setStatus("empty");
      });

    return () => {
      ignore = true;
      ac.abort();
      chart?.remove();
    };
  }, [symbol, compare]);

  if (!symbol) {
    return (
      <div className={cn("flex h-full min-h-24 items-center justify-center border border-dashed border-border bg-surface-2", className)}>
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">Set a ticker</span>
      </div>
    );
  }

  const up = (changePct ?? 0) >= 0;

  return (
    <div className={cn("flex h-full min-h-0 flex-col", className)}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="num text-[0.8125rem] tracking-tight">
          {symbol}
          {compare && compare !== symbol ? <span className="text-text-faint"> · {compare}</span> : null}
        </span>
        {changePct != null ? (
          <span className={cn("num text-[0.75rem]", up ? "text-[var(--up)]" : "text-[var(--down)]")}>
            {up ? "+" : ""}
            {changePct.toFixed(1)}%
          </span>
        ) : (
          <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">Yahoo Finance</span>
        )}
      </div>
      <div
        ref={hostRef}
        className="mt-2 min-h-0 flex-1 overflow-hidden rounded-[var(--radius-btn)] border border-border bg-paper"
        style={{ height: compact ? 160 : 220 }}
        aria-busy={status === "loading"}
      />
      {status === "empty" ? (
        <p className="mt-2 text-[0.8125rem] text-text-faint">No tape for {symbol} yet.</p>
      ) : null}
      {caption ? <p className="mt-2 text-[0.8125rem] leading-snug text-text-mute">{caption}</p> : null}
    </div>
  );
}
