"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Target, Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Estimate, PriceTarget } from "@/lib/market/types";

/**
 * estimatesNode view (A7). Editor pulls EPS estimates vs actuals + the analyst
 * price-target range from /api/market/estimates; results are baked into node
 * attrs so readers render with no live fetch (invariant #2). Beat/miss colored
 * by up/down; all figures in .num.
 */

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function fmtEps(v: number | null): string {
  return v == null ? "-" : v.toFixed(2);
}

function surprise(est: number | null, act: number | null): number | null {
  if (est == null || act == null || est === 0) return null;
  return (act - est) / Math.abs(est);
}

function sentiment(v: number): string | undefined {
  if (v > 0) return "var(--up)";
  if (v < 0) return "var(--down)";
  return undefined;
}

export function EstimatesNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const estimates = (node.attrs.estimates as Estimate[] | null) ?? null;
  const priceTarget = (node.attrs.priceTarget as PriceTarget | null) ?? null;

  const [draftTicker, setDraftTicker] = useState(ticker);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "auth" | "ready">(
    estimates ? "ready" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function pull() {
    const sym = draftTicker.trim().toUpperCase();
    if (!sym) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(`/api/market/estimates?symbol=${encodeURIComponent(sym)}`);
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
      const body = (await res.json()) as { estimates: Estimate[]; priceTarget: PriceTarget | null };
      updateAttributes({
        ticker: sym,
        estimates: body.estimates,
        priceTarget: body.priceTarget,
        source: { kind: "provider", provider: "finnhub" },
      });
      setStatus("ready");
    } catch {
      setStatus("empty");
    }
  }

  function renderBody(rows: Estimate[], pt: PriceTarget | null) {
    const recent = rows.slice(-8);
    return (
      <>
        {pt && (pt.mean != null || pt.high != null) && (
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between text-[11px] text-text-mute">
              <span className="t-eyebrow">Analyst price target</span>
              {pt.count != null && <span className="num">{pt.count} analysts</span>}
            </div>
            <div className="mt-2 flex items-end gap-4">
              <TargetStat label="Low" value={pt.low} />
              <TargetStat label="Mean" value={pt.mean} emphasis />
              <TargetStat label="High" value={pt.high} />
            </div>
          </div>
        )}
        <div className="scroll-area overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-left">
                  Period
                </th>
                <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                  EPS est.
                </th>
                <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                  EPS actual
                </th>
                <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                  Surprise
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => {
                const s = surprise(e.epsEstimate, e.epsActual);
                return (
                  <tr key={e.period} className="border-t border-border hover:bg-surface-2/60">
                    <td className="num px-4 py-2">{e.period}</td>
                    <td className="num px-4 py-2 text-right">{fmtEps(e.epsEstimate)}</td>
                    <td className="num px-4 py-2 text-right">{fmtEps(e.epsActual)}</td>
                    <td className="px-4 py-2 text-right">
                      {s == null ? (
                        <span className="text-text-faint">-</span>
                      ) : (
                        <span className="num" style={{ color: sentiment(s) }}>
                          {s >= 0 ? "+" : ""}
                          {(s * 100).toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  // Reading mode: cached data only.
  if (!isEditable) {
    if (!estimates?.length) {
      return (
        <NodeViewWrapper
          contentEditable={false}
          className="my-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-4 py-8 text-center"
        >
          <p className="t-meta">Estimates unavailable</p>
        </NodeViewWrapper>
      );
    }
    return (
      <NodeViewWrapper
        contentEditable={false}
        role="figure"
        aria-label={`${ticker} estimates`}
        className="fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      >
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <Target size={14} className="text-text-faint" />
          <span className="num text-sm font-semibold">{ticker}</span>
          <span className="t-eyebrow">Estimates</span>
        </div>
        {renderBody(estimates, priceTarget)}
      </NodeViewWrapper>
    );
  }

  const statusMessage =
    status === "loading"
      ? "Pulling estimates..."
      : status === "auth"
        ? "Sign in to pull estimates"
        : status === "empty"
          ? error ?? "No estimate data for this ticker"
          : "Enter a ticker and pull estimates";

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
          <Target size={13} className="text-text-faint" />
          <input
            value={draftTicker}
            onChange={(e) => setDraftTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pull())}
            onMouseDown={stop}
            placeholder="Ticker"
            className="num w-16 bg-transparent text-sm font-semibold focus:outline-none"
          />
        </span>
        <button
          type="button"
          onMouseDown={stop}
          onClick={() => pull()}
          className="h-7 rounded-[var(--radius-btn)] bg-accent px-2.5 text-[11px] font-semibold text-accent-ink focus-ring"
        >
          Pull estimates
        </button>
        <button
          type="button"
          aria-label="Delete estimates"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {estimates?.length && status !== "loading" ? (
        renderBody(estimates, priceTarget)
      ) : (
        <div className="flex items-center justify-center px-4 py-10">
          <p className="t-meta text-[12px]">{statusMessage}</p>
        </div>
      )}
    </NodeViewWrapper>
  );
}

function TargetStat({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number | null;
  emphasis?: boolean;
}) {
  return (
    <div className="flex flex-col">
      <span className="t-eyebrow text-[10px]">{label}</span>
      <span className={cn("num", emphasis ? "text-lg font-semibold text-text" : "text-sm text-text-mute")}>
        {value == null ? "-" : `$${value.toFixed(2)}`}
      </span>
    </div>
  );
}
