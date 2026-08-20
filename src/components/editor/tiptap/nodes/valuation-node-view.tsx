"use client";

import { useEffect, useMemo, useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Calculator, Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { TickerChip } from "@/components/ui/ticker-chip";
import { dcf, dcfSensitivity, type DcfResult } from "@/lib/valuation/model";
import { diverging } from "@/lib/design/chart-theme";

/**
 * valuationNode view (A1). DCF calculator: inputs left, output card right (fair
 * value, upside, PV-by-year bars, 5x5 sensitivity heatmap on the diverging
 * scale). Computes live via the pure model and caches the result in attrs so a
 * reader renders it without recomputation. Drives the publish target when set.
 */

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function fmtMoney(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toFixed(2);
}

function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

const inputClass =
  "num h-8 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm focus-ring";

export function ValuationNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const fcfAttr = node.attrs.fcf;
  const fcf = useMemo(
    (): number[] => (Array.isArray(fcfAttr) ? fcfAttr : []),
    [fcfAttr],
  );
  const wacc = Number(node.attrs.wacc ?? 0.09);
  const terminalMethod = (node.attrs.terminalMethod ?? "gordon") as "gordon" | "exit";
  const growth = Number(node.attrs.growth ?? 0.025);
  const exitMetric = Number(node.attrs.exitMetric ?? 0);
  const exitMultiple = Number(node.attrs.exitMultiple ?? 12);
  const netDebt = Number(node.attrs.netDebt ?? 0);
  const dilutedShares = Number(node.attrs.dilutedShares ?? 0);
  const lastPrice = node.attrs.lastPrice != null ? Number(node.attrs.lastPrice) : null;
  const drivesTarget = node.attrs.drivesTarget === true;
  const cached = (node.attrs.computed as DcfResult | null) ?? null;

  const [fcfDraft, setFcfDraft] = useState(fcf.join(", "));
  const [pullingPrice, setPullingPrice] = useState(false);

  const { result, error } = useMemo(() => {
    if (dilutedShares <= 0 || fcf.length === 0) {
      return { result: null as DcfResult | null, error: null as string | null };
    }
    try {
      return {
        result: dcf({
          fcf,
          wacc,
          terminal:
            terminalMethod === "gordon"
              ? { method: "gordon", growth }
              : { method: "exit", metric: exitMetric, multiple: exitMultiple },
          netDebt,
          dilutedShares,
          lastPrice,
        }),
        error: null,
      };
    } catch (e) {
      return { result: null, error: e instanceof Error ? e.message : "Invalid inputs" };
    }
  }, [fcf, wacc, terminalMethod, growth, exitMetric, exitMultiple, netDebt, dilutedShares, lastPrice]);

  // Cache the computed result into attrs so the reader renders without recompute.
  useEffect(() => {
    if (!isEditable) return;
    const serialized = result ? JSON.stringify(result) : null;
    if (serialized !== JSON.stringify(cached)) {
      updateAttributes({ computed: result });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, isEditable]);

  const shown = result ?? cached;

  const sensitivity = useMemo(() => {
    if (!isEditable || terminalMethod !== "gordon" || dilutedShares <= 0 || fcf.length === 0) {
      return null;
    }
    const waccSteps = [-0.02, -0.01, 0, 0.01, 0.02].map((d) => Math.max(0.005, wacc + d));
    const growthSteps = [-0.01, -0.005, 0, 0.005, 0.01].map((d) => growth + d);
    try {
      const grid = dcfSensitivity(
        { fcf, wacc, terminal: { method: "gordon", growth }, netDebt, dilutedShares, lastPrice },
        waccSteps,
        growthSteps,
      );
      return { grid, waccSteps, growthSteps };
    } catch {
      return null;
    }
  }, [fcf, wacc, growth, netDebt, dilutedShares, lastPrice, terminalMethod, isEditable]);

  async function pullPrice() {
    const t = ticker.trim().toUpperCase();
    if (!t) return;
    setPullingPrice(true);
    try {
      const res = await fetch(`/api/market/quote?ticker=${encodeURIComponent(t)}`);
      if (res.ok) {
        const body = (await res.json()) as { price?: number };
        if (typeof body.price === "number") updateAttributes({ lastPrice: body.price });
      }
    } finally {
      setPullingPrice(false);
    }
  }

  function commitFcf() {
    const parsed = fcfDraft
      .split(",")
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));
    updateAttributes({ fcf: parsed });
  }

  const outputCard = (
    <div className="flex flex-col gap-3">
      {shown ? (
        <>
          <div>
            <span className="t-eyebrow">Fair value / share</span>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="num text-3xl font-semibold">${shown.fairValuePerShare.toFixed(2)}</span>
              {shown.upside != null && (
                <span
                  className="num text-sm font-medium"
                  style={{ color: shown.upside >= 0 ? "var(--up)" : "var(--down)" }}
                >
                  {pct(shown.upside)}
                </span>
              )}
            </div>
            {lastPrice != null && (
              <span className="t-meta text-[11px]">vs last ${lastPrice.toFixed(2)}</span>
            )}
          </div>

          <div>
            <span className="t-eyebrow">PV by year</span>
            <div className="mt-1 flex items-end gap-1" style={{ height: 48 }}>
              {shown.pvByYear.map((v, i) => {
                const max = Math.max(...shown.pvByYear.map(Math.abs), 1);
                return (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div
                      className="w-full rounded-[2px]"
                      style={{
                        height: `${Math.max(2, (Math.abs(v) / max) * 40)}px`,
                        background: "var(--verdigris)",
                        opacity: 0.85,
                      }}
                    />
                    <span className="num text-[10px] text-text-faint">{i + 1}</span>
                  </div>
                );
              })}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-6 rounded-[2px]"
                  style={{
                    height: `${Math.max(2, (Math.abs(shown.pvTerminal) / Math.max(...shown.pvByYear.map(Math.abs), Math.abs(shown.pvTerminal), 1)) * 40)}px`,
                    background: "var(--brass)",
                  }}
                />
                <span className="num text-[10px] text-text-faint">TV</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <span className="t-meta">Enterprise value</span>
            <span className="num text-right">{fmtMoney(shown.enterpriseValue)}</span>
            <span className="t-meta">Equity value</span>
            <span className="num text-right">{fmtMoney(shown.equityValue)}</span>
          </div>
        </>
      ) : (
        <p className="t-meta">{error ?? "Enter FCF and shares to compute"}</p>
      )}
    </div>
  );

  // Reading mode: output card only (+ sensitivity is editor-only).
  if (!isEditable) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        role="figure"
        aria-label={`Valuation for ${ticker || "company"}`}
        className={cn("fade-up my-4 p-4", drivesTarget ? "ledger-card" : "surface")}
      >
        <div className="mb-2 flex items-center gap-2">
          <Calculator size={14} className="text-text-faint" />
          {ticker && <TickerChip ticker={ticker} />}
          <span className="t-eyebrow">DCF valuation</span>
          {drivesTarget && <span className="t-meta text-[11px]">drives target</span>}
        </div>
        {outputCard}
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
        <Calculator size={14} className="text-text-faint" />
        <span className="t-eyebrow flex-1">DCF valuation</span>
        <label className="flex items-center gap-1.5 text-[11px] text-text-mute">
          <input
            type="checkbox"
            checked={drivesTarget}
            onChange={(e) => updateAttributes({ drivesTarget: e.target.checked })}
          />
          Drives target
        </label>
        <button
          type="button"
          aria-label="Delete valuation"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="grid gap-4 p-4 md:grid-cols-2">
        {/* Inputs */}
        <div className="flex flex-col gap-2.5">
          <div className="flex items-end gap-2">
            <label className="flex-1 text-[11px] text-text-mute">
              Ticker
              <input
                value={ticker}
                onChange={(e) => updateAttributes({ ticker: e.target.value.toUpperCase() })}
                onMouseDown={stop}
                className={cn(inputClass, "mt-0.5")}
                placeholder="NVDA"
              />
            </label>
            <button
              type="button"
              onMouseDown={stop}
              onClick={pullPrice}
              disabled={pullingPrice}
              className="h-8 rounded-[var(--radius-btn)] border border-border px-2 text-[11px] text-text-mute hover:bg-surface-2 focus-ring"
            >
              {pullingPrice ? "..." : "Pull price"}
            </button>
          </div>

          <label className="text-[11px] text-text-mute">
            Free cash flow by year (comma-separated)
            <input
              value={fcfDraft}
              onChange={(e) => setFcfDraft(e.target.value)}
              onBlur={commitFcf}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), commitFcf())}
              onMouseDown={stop}
              className={cn(inputClass, "mt-0.5")}
              placeholder="1000, 1150, 1300, 1450, 1600"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-text-mute">
              WACC %
              <input
                type="number"
                step={0.1}
                value={(wacc * 100).toString()}
                onChange={(e) => updateAttributes({ wacc: Number(e.target.value) / 100 })}
                onMouseDown={stop}
                className={cn(inputClass, "mt-0.5")}
              />
            </label>
            <label className="text-[11px] text-text-mute">
              Terminal
              <select
                value={terminalMethod}
                onMouseDown={stop}
                onChange={(e) => updateAttributes({ terminalMethod: e.target.value })}
                className={cn(inputClass, "mt-0.5")}
              >
                <option value="gordon">Gordon growth</option>
                <option value="exit">Exit multiple</option>
              </select>
            </label>
          </div>

          {terminalMethod === "gordon" ? (
            <label className="text-[11px] text-text-mute">
              Terminal growth %
              <input
                type="number"
                step={0.1}
                value={(growth * 100).toString()}
                onChange={(e) => updateAttributes({ growth: Number(e.target.value) / 100 })}
                onMouseDown={stop}
                className={cn(inputClass, "mt-0.5")}
              />
            </label>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-text-mute">
                Exit metric
                <input
                  type="number"
                  value={exitMetric}
                  onChange={(e) => updateAttributes({ exitMetric: Number(e.target.value) })}
                  onMouseDown={stop}
                  className={cn(inputClass, "mt-0.5")}
                />
              </label>
              <label className="text-[11px] text-text-mute">
                Exit multiple
                <input
                  type="number"
                  value={exitMultiple}
                  onChange={(e) => updateAttributes({ exitMultiple: Number(e.target.value) })}
                  onMouseDown={stop}
                  className={cn(inputClass, "mt-0.5")}
                />
              </label>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-text-mute">
              Net debt
              <input
                type="number"
                value={netDebt}
                onChange={(e) => updateAttributes({ netDebt: Number(e.target.value) })}
                onMouseDown={stop}
                className={cn(inputClass, "mt-0.5")}
              />
            </label>
            <label className="text-[11px] text-text-mute">
              Diluted shares
              <input
                type="number"
                value={dilutedShares}
                onChange={(e) => updateAttributes({ dilutedShares: Number(e.target.value) })}
                onMouseDown={stop}
                className={cn(inputClass, "mt-0.5")}
              />
            </label>
          </div>
        </div>

        {/* Output */}
        <div className="rounded-[var(--radius-btn)] border border-border bg-bg p-3">
          {outputCard}
          {sensitivity && shown && (
            <div className="mt-3">
              <span className="t-eyebrow">Sensitivity (WACC x growth)</span>
              <div className="mt-1 overflow-hidden rounded-[4px]">
                {sensitivity.grid.map((row, ri) => {
                  const flat = sensitivity.grid.flat().filter((n) => Number.isFinite(n));
                  const min = Math.min(...flat);
                  const max = Math.max(...flat);
                  return (
                    <div key={ri} className="flex">
                      {row.map((cell, ci) => {
                        const t = max > min ? (cell - min) / (max - min) : 0.5;
                        return (
                          <div
                            key={ci}
                            className="num flex flex-1 items-center justify-center py-1 text-[10px]"
                            style={{ background: Number.isFinite(cell) ? diverging(t) : "var(--surface-2)" }}
                            title={`WACC ${(sensitivity.waccSteps[ri] * 100).toFixed(1)}% / g ${(sensitivity.growthSteps[ci] * 100).toFixed(1)}%`}
                          >
                            {Number.isFinite(cell) ? cell.toFixed(0) : "-"}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </NodeViewWrapper>
  );
}
