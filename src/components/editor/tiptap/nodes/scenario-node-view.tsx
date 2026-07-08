"use client";

import { useEffect, useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { BarChart2, Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { scenario, type ScenarioCase, type ScenarioResult } from "@/lib/valuation/model";

/**
 * scenarioNode view (A2). Bull/base/bear x price x probability with a sum=100
 * validator, producing a probability-weighted target and expected upside.
 * Computes live via the pure model; caches the result for the reader.
 */

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

const CASE_COLOR: Record<string, string> = {
  Bull: "var(--up)",
  Base: "var(--brass)",
  Bear: "var(--down)",
};

export function ScenarioNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const casesAttr = node.attrs.cases;
  const cases = useMemo(
    (): ScenarioCase[] => (Array.isArray(casesAttr) ? casesAttr : []),
    [casesAttr],
  );
  const lastPrice = node.attrs.lastPrice != null ? Number(node.attrs.lastPrice) : null;
  const drivesTarget = node.attrs.drivesTarget === true;
  const cached = (node.attrs.computed as ScenarioResult | null) ?? null;

  const [pulling, setPulling] = useState(false);

  const result = useMemo(() => scenario(cases, lastPrice), [cases, lastPrice]);

  useEffect(() => {
    if (!isEditable) return;
    if (JSON.stringify(result) !== JSON.stringify(cached)) {
      updateAttributes({ computed: result });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, isEditable]);

  const shown = isEditable ? result : (cached ?? result);

  function updateCase(i: number, patch: Partial<ScenarioCase>) {
    updateAttributes({ cases: cases.map((c, idx) => (idx === i ? { ...c, ...patch } : c)) });
  }

  async function pullPrice() {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setPulling(true);
    try {
      const res = await fetch(`/api/market/quote?ticker=${encodeURIComponent(t)}`);
      if (res.ok) {
        const body = (await res.json()) as { price?: number };
        if (typeof body.price === "number") updateAttributes({ lastPrice: body.price });
      }
    } finally {
      setPulling(false);
    }
  }

  const resultCard = (
    <div className="flex flex-col gap-2">
      <div>
        <span className="t-eyebrow">Weighted target</span>
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="num text-2xl font-semibold">${shown.weightedTarget.toFixed(2)}</span>
          {shown.expectedUpside != null && (
            <span
              className="num text-sm font-medium"
              style={{ color: shown.expectedUpside >= 0 ? "var(--up)" : "var(--down)" }}
            >
              {pct(shown.expectedUpside)}
            </span>
          )}
        </div>
      </div>
      {/* Probability bar */}
      <div className="flex h-2 overflow-hidden rounded-[2px]">
        {cases.map((c, i) => (
          <div
            key={i}
            style={{
              width: `${Math.max(0, c.probability)}%`,
              background: CASE_COLOR[c.label] ?? "var(--text-faint)",
            }}
          />
        ))}
      </div>
      {!shown.valid && (
        <span className="text-[11px] text-[var(--down)]">
          Probabilities total {shown.probabilityTotal}% (must be 100%)
        </span>
      )}
    </div>
  );

  if (!isEditable) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        role="figure"
        aria-label={`Scenario analysis for ${ticker || "company"}`}
        className={cn("fade-up my-4 p-4", drivesTarget ? "ledger-card" : "surface")}
      >
        <div className="mb-2 flex items-center gap-2">
          <BarChart2 size={14} className="text-text-faint" />
          {ticker && <span className="num text-sm font-semibold">{ticker}</span>}
          <span className="t-eyebrow">Scenario analysis</span>
          {drivesTarget && <span className="t-meta text-[11px]">drives target</span>}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            {cases.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-[2px]"
                    style={{ background: CASE_COLOR[c.label] ?? "var(--text-faint)" }}
                  />
                  {c.label}
                </span>
                <span className="num text-text-mute">
                  ${c.price.toFixed(2)} - {c.probability}%
                </span>
              </div>
            ))}
          </div>
          {resultCard}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "fade-up my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
        drivesTarget && "ledger-card",
      )}
      onMouseDown={stop}
      onClick={stop}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <BarChart2 size={14} className="text-text-faint" />
        <input
          value={ticker}
          onChange={(e) => updateAttributes({ ticker: e.target.value.toUpperCase() })}
          onMouseDown={stop}
          placeholder="Ticker"
          className="num h-7 w-20 rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm font-semibold focus:outline-none"
        />
        <button
          type="button"
          onMouseDown={stop}
          onClick={pullPrice}
          disabled={pulling}
          className="h-7 rounded-[var(--radius-btn)] border border-border px-2 text-[11px] text-text-mute hover:bg-surface-2 focus-ring"
        >
          {pulling ? "..." : lastPrice != null ? `$${lastPrice.toFixed(2)}` : "Pull price"}
        </button>
        <label className="ml-auto flex items-center gap-1.5 text-[11px] text-text-mute">
          <input
            type="checkbox"
            checked={drivesTarget}
            onChange={(e) => updateAttributes({ drivesTarget: e.target.checked })}
          />
          Drives target
        </label>
        <button
          type="button"
          aria-label="Delete scenario"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-[10px] text-text-faint">
            <span className="t-eyebrow">Case</span>
            <span className="t-eyebrow w-20 text-right">Price</span>
            <span className="t-eyebrow w-16 text-right">Prob %</span>
          </div>
          {cases.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
              <span className="flex items-center gap-1.5 text-sm">
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ background: CASE_COLOR[c.label] ?? "var(--text-faint)" }}
                />
                {c.label}
              </span>
              <input
                type="number"
                value={c.price}
                onChange={(e) => updateCase(i, { price: Number(e.target.value) })}
                onMouseDown={stop}
                className="num h-8 w-20 rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-right text-sm focus-ring"
              />
              <input
                type="number"
                value={c.probability}
                onChange={(e) => updateCase(i, { probability: Number(e.target.value) })}
                onMouseDown={stop}
                className="num h-8 w-16 rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-right text-sm focus-ring"
              />
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-btn)] border border-border bg-bg p-3">{resultCard}</div>
      </div>
    </NodeViewWrapper>
  );
}
