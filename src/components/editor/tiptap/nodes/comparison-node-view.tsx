"use client";

import { useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Columns3, Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { seriesColor } from "@/lib/design/chart-theme";
import type { Comparison, ComparisonMetric } from "@/lib/market/types";

/**
 * comparisonNode view (A6). Editor pulls a metric time series for 2-8 tickers
 * from /api/market/comparison and charts it; the result is baked into node attrs
 * so readers render with no live fetch (invariant #2). Series colors come from
 * the shared chart theme (categorical scale); numbers use the metric's unit.
 */

const METRICS: { key: ComparisonMetric; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "netIncome", label: "Net income" },
  { key: "eps", label: "EPS" },
  { key: "grossMargin", label: "Gross margin" },
  { key: "operatingMargin", label: "Operating margin" },
  { key: "netMargin", label: "Net margin" },
  { key: "revenueGrowth", label: "Revenue growth" },
];

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

/** Resolve a CSS color expression (var / color-mix) to a concrete rgb() string. */
function resolveColor(expr: string): string {
  if (typeof document === "undefined") return expr;
  const el = document.createElement("span");
  el.style.color = expr;
  document.body.appendChild(el);
  const c = getComputedStyle(el).color;
  el.remove();
  return c || expr;
}

function makeFormatter(unit: Comparison["unit"]): (v: number) => string {
  if (unit === "pct") return (v) => `${v.toFixed(1)}%`;
  if (unit === "perShare") return (v) => `$${v.toFixed(2)}`;
  return (v) => {
    const abs = Math.abs(v);
    if (abs >= 1e12) return `${(v / 1e12).toFixed(1)}T`;
    if (abs >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  };
}

export function ComparisonNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const symbols: string[] = Array.isArray(node.attrs.symbols) ? node.attrs.symbols : [];
  const metric = (node.attrs.metric ?? "revenue") as ComparisonMetric;
  const years = Number(node.attrs.years ?? 5);
  const kind = (node.attrs.kind ?? "line") as "line" | "bar";
  const comparison = (node.attrs.comparison as Comparison | null) ?? null;

  const [draft, setDraft] = useState(symbols.join(", "));
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "auth" | "ready">(
    comparison ? "ready" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  const colors = useMemo(
    () => (comparison?.series ?? []).map((_, i) => resolveColor(seriesColor(i))),
    [comparison?.series],
  );

  async function pull(nextMetric: ComparisonMetric = metric, nextYears = years, nextKind = kind) {
    const parsed = draft
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, 8);
    if (parsed.length === 0) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/market/comparison?symbols=${encodeURIComponent(parsed.join(","))}&metric=${nextMetric}&years=${nextYears}`,
      );
      if (res.status === 401) {
        setStatus("auth");
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? null);
        setStatus("empty");
        return;
      }
      const body = (await res.json()) as { comparison: Comparison };
      updateAttributes({
        symbols: parsed,
        metric: nextMetric,
        years: nextYears,
        kind: nextKind,
        comparison: body.comparison,
        source: body.comparison.source,
      });
      setStatus("ready");
    } catch {
      setStatus("empty");
    }
  }

  function renderChart(c: Comparison) {
    const fmt = makeFormatter(c.unit);
    const data = c.periods.map((p, i) => {
      const row: Record<string, string | number | null> = { period: p };
      for (const s of c.series) row[s.symbol] = s.values[i];
      return row;
    });
    const metricLabel = METRICS.find((m) => m.key === c.metric)?.label ?? c.metric;
    return (
      <div className="px-2 py-3">
        <div className="h-[280px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {kind === "bar" ? (
              <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={fmt}
                />
                <Tooltip
                  cursor={{ fill: "var(--surface-2)", opacity: 0.4 }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number | string) =>
                    typeof v === "number" ? fmt(v) : String(v)
                  }
                />
                {c.series.map((s, i) => (
                  <Bar key={s.symbol} dataKey={s.symbol} fill={colors[i]} radius={[2, 2, 0, 0]} />
                ))}
              </BarChart>
            ) : (
              <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="period"
                  tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tick={{ fill: "var(--text-faint)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  tickFormatter={fmt}
                />
                <Tooltip
                  cursor={{ stroke: "var(--border-strong)" }}
                  contentStyle={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number | string) =>
                    typeof v === "number" ? fmt(v) : String(v)
                  }
                />
                {c.series.map((s, i) => (
                  <Line
                    key={s.symbol}
                    type="monotone"
                    dataKey={s.symbol}
                    stroke={colors[i]}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-2 pt-1">
          <span className="t-eyebrow">{metricLabel}</span>
          {c.series.map((s, i) => (
            <span key={s.symbol} className="flex items-center gap-1.5 text-[11px] text-text-mute">
              <span
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{ background: colors[i] }}
              />
              <span className="num">{s.symbol}</span>
            </span>
          ))}
        </div>
      </div>
    );
  }

  // Reading mode: cached data only.
  if (!isEditable) {
    if (!comparison?.series?.length) {
      return (
        <NodeViewWrapper
          contentEditable={false}
          className="my-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-4 py-8 text-center"
        >
          <p className="t-meta">Comparison unavailable</p>
        </NodeViewWrapper>
      );
    }
    return (
      <NodeViewWrapper
        contentEditable={false}
        role="figure"
        aria-label={`Comparison of ${comparison.series.map((s) => s.symbol).join(", ")}`}
        className="fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      >
        {renderChart(comparison)}
      </NodeViewWrapper>
    );
  }

  const statusMessage =
    status === "loading"
      ? "Pulling comparison..."
      : status === "auth"
        ? "Sign in to pull data"
        : status === "empty"
          ? error ?? "No data for these tickers"
          : "Enter tickers and pull a comparison";

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stop}
      onClick={stop}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-7 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2">
          <Columns3 size={13} className="text-text-faint" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pull())}
            onMouseDown={stop}
            placeholder="NVDA, AMD, INTC"
            className="num w-40 bg-transparent text-sm font-semibold focus:outline-none"
          />
        </span>

        <select
          value={metric}
          onMouseDown={stop}
          onChange={(e) => pull(e.target.value as ComparisonMetric, years, kind)}
          className="h-7 rounded-[var(--radius-btn)] border border-border bg-bg px-1.5 text-[11px] text-text-mute focus-ring"
        >
          {METRICS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        <select
          value={years}
          onMouseDown={stop}
          onChange={(e) => pull(metric, Number(e.target.value), kind)}
          className="h-7 rounded-[var(--radius-btn)] border border-border bg-bg px-1.5 text-[11px] text-text-mute focus-ring"
        >
          {[3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n}y
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-[var(--radius-btn)] border border-border bg-bg p-0.5">
          {(["line", "bar"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onMouseDown={stop}
              onClick={() => updateAttributes({ kind: k })}
              className={cn(
                "rounded-[4px] px-2 py-0.5 text-[11px] font-medium capitalize transition-colors",
                kind === k ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:text-text",
              )}
            >
              {k}
            </button>
          ))}
        </div>

        <button
          type="button"
          onMouseDown={stop}
          onClick={() => pull()}
          className="h-7 rounded-[var(--radius-btn)] bg-accent px-2.5 text-[11px] font-semibold text-accent-ink focus-ring"
        >
          Pull comparison
        </button>

        <button
          type="button"
          aria-label="Delete comparison"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {comparison?.series?.length && status !== "loading" ? (
        renderChart(comparison)
      ) : (
        <div className="flex items-center justify-center px-4 py-14">
          <p className="t-meta text-[12px]">{statusMessage}</p>
        </div>
      )}
    </NodeViewWrapper>
  );
}
