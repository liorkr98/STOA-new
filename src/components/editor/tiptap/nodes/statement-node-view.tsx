"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Landmark, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Download } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { FinancialStatement, StatementKind } from "@/lib/market/types";

/**
 * statementNode view (A4). In the editor an analyst pulls an EDGAR statement via
 * /api/market/statement; the result is baked into node attrs so a reader renders
 * it with no live fetch (invariant #2). Uses the data-table visual pattern
 * (docs/DESIGN_LANGUAGE.md 7.1): hairline rows, right-aligned .num, YoY/CAGR
 * colored by up/down. A financial statement is transposed (line-item rows,
 * period columns) so it is a bespoke table on the same visual language rather
 * than the generic sortable DataTable.
 */

const KINDS: { key: StatementKind; label: string }[] = [
  { key: "income", label: "Income" },
  { key: "balance", label: "Balance" },
  { key: "cashflow", label: "Cash Flow" },
];

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function fmtNum(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}

function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(1)}%`;
}

function sentiment(v: number): string | undefined {
  if (v > 0) return "var(--up)";
  if (v < 0) return "var(--down)";
  return undefined;
}

/** YoY between the two most recent non-null values. */
function yoy(values: (number | null)[]): number | null {
  let last: number | null = null;
  let prev: number | null = null;
  for (const v of values) {
    if (v == null) continue;
    prev = last;
    last = v;
  }
  if (last == null || prev == null || prev === 0) return null;
  return (last - prev) / Math.abs(prev);
}

/** Compound annual growth across the first and last non-null values. */
function cagr(values: (number | null)[]): number | null {
  let firstIdx = -1;
  let lastIdx = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i] == null) continue;
    if (firstIdx === -1) firstIdx = i;
    lastIdx = i;
  }
  if (firstIdx === -1 || lastIdx === firstIdx) return null;
  const first = values[firstIdx] as number;
  const last = values[lastIdx] as number;
  if (first <= 0 || last <= 0) return null;
  return (last / first) ** (1 / (lastIdx - firstIdx)) - 1;
}

export function StatementNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const ticker = String(node.attrs.ticker ?? "");
  const kind = (node.attrs.kind ?? "income") as StatementKind;
  const years = Number(node.attrs.years ?? 5);
  const showYoY = node.attrs.showYoY !== false;
  const showCagr = node.attrs.showCagr === true;
  const hiddenRows: string[] = Array.isArray(node.attrs.hiddenRows) ? node.attrs.hiddenRows : [];
  const rowOrder: string[] | null = Array.isArray(node.attrs.rowOrder) ? node.attrs.rowOrder : null;
  const statement = (node.attrs.statement as FinancialStatement | null) ?? null;

  const [draftTicker, setDraftTicker] = useState(ticker);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "auth" | "ready">(
    statement ? "ready" : "idle",
  );
  const [error, setError] = useState<string | null>(null);

  async function pull(nextKind: StatementKind = kind, nextYears: number = years) {
    const sym = draftTicker.trim().toUpperCase();
    if (!sym) return;
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(
        `/api/market/statement?symbol=${encodeURIComponent(sym)}&kind=${nextKind}&years=${nextYears}`,
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
      const body = (await res.json()) as { statement: FinancialStatement };
      updateAttributes({
        ticker: sym,
        kind: nextKind,
        years: nextYears,
        statement: body.statement,
        source: body.statement.source,
      });
      setStatus("ready");
    } catch {
      setStatus("empty");
    }
  }

  function toggleRow(concept: string) {
    updateAttributes({
      hiddenRows: hiddenRows.includes(concept)
        ? hiddenRows.filter((c) => c !== concept)
        : [...hiddenRows, concept],
    });
  }

  function moveRow(concept: string, dir: -1 | 1) {
    if (!statement) return;
    const order = rowOrder ?? statement.lines.map((l) => l.concept);
    const idx = order.indexOf(concept);
    const swap = idx + dir;
    if (idx === -1 || swap < 0 || swap >= order.length) return;
    const next = [...order];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    updateAttributes({ rowOrder: next });
  }

  function orderedLines(s: FinancialStatement) {
    if (!rowOrder) return s.lines;
    const byConcept = new Map(s.lines.map((l) => [l.concept, l]));
    const ordered = rowOrder.map((c) => byConcept.get(c)).filter((l): l is NonNullable<typeof l> => !!l);
    const rest = s.lines.filter((l) => !rowOrder.includes(l.concept));
    return [...ordered, ...rest];
  }

  function exportCsv() {
    if (!statement) return;
    const cols = ["Line", ...statement.periods];
    const rows = orderedLines(statement)
      .filter((l) => !hiddenRows.includes(l.concept))
      .map((l) => [l.label, ...l.values.map((v) => (v == null ? "" : String(v)))]);
    const csv = [cols, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${ticker || "statement"}-${kind}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const kindLabel = KINDS.find((k) => k.key === kind)?.label ?? "Income";

  function renderTable(s: FinancialStatement) {
    const lines = orderedLines(s);
    const visibleLines = isEditable ? lines : lines.filter((l) => !hiddenRows.includes(l.concept));
    return (
      <div className="scroll-area overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {isEditable && <th className="w-8 border-b border-border-strong px-2 py-2.5" />}
              <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-left">Line</th>
              {s.periods.map((p) => (
                <th
                  key={p}
                  className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right whitespace-nowrap"
                >
                  {p}
                </th>
              ))}
              {showYoY && (
                <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                  YoY
                </th>
              )}
              {showCagr && (
                <th className="t-eyebrow border-b border-border-strong px-4 py-2.5 text-right">
                  CAGR
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {visibleLines.map((line) => {
              const hidden = hiddenRows.includes(line.concept);
              const y = yoy(line.values);
              const c = cagr(line.values);
              return (
                <tr
                  key={line.concept}
                  className={cn(
                    "border-t border-border",
                    hidden ? "opacity-40" : "hover:bg-surface-2/60",
                  )}
                >
                  {isEditable && (
                    <td className="px-2 py-2 align-middle">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={hidden ? "Show row" : "Hide row"}
                          onMouseDown={stop}
                          onClick={() => toggleRow(line.concept)}
                          className="focus-ring text-text-faint hover:text-text"
                        >
                          {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-2 align-middle">
                    <span className="flex items-center gap-1.5">
                      {line.label}
                      {isEditable && (
                        <span className="inline-flex opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            type="button"
                            aria-label="Move up"
                            onMouseDown={stop}
                            onClick={() => moveRow(line.concept, -1)}
                            className="focus-ring text-text-faint hover:text-text"
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            type="button"
                            aria-label="Move down"
                            onMouseDown={stop}
                            onClick={() => moveRow(line.concept, 1)}
                            className="focus-ring text-text-faint hover:text-text"
                          >
                            <ChevronDown size={12} />
                          </button>
                        </span>
                      )}
                    </span>
                  </td>
                  {line.values.map((v, i) => (
                    <td key={i} className="px-4 py-2 text-right align-middle">
                      {v == null ? (
                        <span className="text-text-faint">-</span>
                      ) : (
                        <span className="num">{fmtNum(v)}</span>
                      )}
                    </td>
                  ))}
                  {showYoY && (
                    <td className="px-4 py-2 text-right align-middle">
                      {y == null ? (
                        <span className="text-text-faint">-</span>
                      ) : (
                        <span className="num" style={{ color: sentiment(y) }}>
                          {pct(y)}
                        </span>
                      )}
                    </td>
                  )}
                  {showCagr && (
                    <td className="px-4 py-2 text-right align-middle">
                      {c == null ? (
                        <span className="text-text-faint">-</span>
                      ) : (
                        <span className="num" style={{ color: sentiment(c) }}>
                          {pct(c)}
                        </span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Reading mode: render the cached statement, never fetch. Calm empty state if
  // the analyst never pulled one.
  if (!isEditable) {
    if (!statement) {
      return (
        <NodeViewWrapper
          contentEditable={false}
          className="my-4 rounded-[var(--radius-card)] border border-dashed border-border bg-surface px-4 py-8 text-center"
        >
          <p className="t-meta">Financial statement unavailable</p>
        </NodeViewWrapper>
      );
    }
    return (
      <NodeViewWrapper
        contentEditable={false}
        role="figure"
        aria-label={`${statement.symbol} ${kindLabel} statement`}
        className="fade-up group my-4 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          <span className="flex items-center gap-2">
            <Landmark size={14} className="text-text-faint" />
            <span className="num text-sm font-semibold">{statement.symbol}</span>
            <span className="t-eyebrow">{kindLabel}</span>
          </span>
          {statement.source?.provider && (
            <span className="t-meta text-[11px]">
              Source: {statement.source.provider.toUpperCase()}
              {statement.source.asOf ? ` - filed ${statement.source.asOf}` : ""}
            </span>
          )}
        </div>
        {renderTable(statement)}
      </NodeViewWrapper>
    );
  }

  const statusMessage =
    status === "loading"
      ? "Pulling financials from EDGAR..."
      : status === "auth"
        ? "Sign in to pull financials"
        : status === "empty"
          ? error ?? "No filing data for this ticker"
          : "Enter a ticker and pull financials";

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "fade-up group my-4 overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stop}
      onClick={stop}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <span className="flex h-7 items-center gap-1.5 rounded-[var(--radius-btn)] border border-border bg-bg px-2">
          <Landmark size={13} className="text-text-faint" />
          <input
            value={draftTicker}
            onChange={(e) => setDraftTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), pull())}
            onMouseDown={stop}
            placeholder="Ticker"
            className="num w-16 bg-transparent text-sm font-semibold focus:outline-none"
          />
        </span>

        <Seg value={kind} options={KINDS} onChange={(k) => pull(k, years)} />

        <select
          value={years}
          onMouseDown={stop}
          onChange={(e) => pull(kind, Number(e.target.value))}
          className="h-7 rounded-[var(--radius-btn)] border border-border bg-bg px-1.5 text-[11px] text-text-mute focus-ring"
        >
          {[3, 5, 8, 10].map((n) => (
            <option key={n} value={n}>
              {n}y
            </option>
          ))}
        </select>

        <div className="hidden h-4 w-px bg-border sm:block" />

        <button
          type="button"
          onMouseDown={stop}
          onClick={() => updateAttributes({ showYoY: !showYoY })}
          className={cn(
            "h-7 rounded-[var(--radius-btn)] px-2 text-[11px] font-medium transition-colors focus-ring",
            showYoY ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:bg-surface-2",
          )}
        >
          YoY
        </button>
        <button
          type="button"
          onMouseDown={stop}
          onClick={() => updateAttributes({ showCagr: !showCagr })}
          className={cn(
            "h-7 rounded-[var(--radius-btn)] px-2 text-[11px] font-medium transition-colors focus-ring",
            showCagr ? "bg-[var(--ink)] text-[var(--paper)]" : "text-text-mute hover:bg-surface-2",
          )}
        >
          CAGR
        </button>

        <button
          type="button"
          onMouseDown={stop}
          onClick={() => pull()}
          className="h-7 rounded-[var(--radius-btn)] bg-accent px-2.5 text-[11px] font-semibold text-accent-ink focus-ring"
        >
          Pull financials
        </button>

        {statement && (
          <button
            type="button"
            aria-label="Export CSV"
            onMouseDown={stop}
            onClick={exportCsv}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-text focus-ring"
          >
            <Download size={14} />
          </button>
        )}

        <button
          type="button"
          aria-label="Delete statement"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      {statement && status !== "loading" ? (
        <>
          {renderTable(statement)}
          {statement.source?.asOf && (
            <div className="border-t border-border px-4 py-1.5">
              <span className="t-meta text-[11px]">
                Source: EDGAR - last filed {statement.source.asOf}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center px-4 py-10">
          <p className="t-meta text-[12px]">{statusMessage}</p>
        </div>
      )}
    </NodeViewWrapper>
  );
}

function Seg<T extends string>({
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
          onMouseDown={stop}
          onClick={(e) => {
            e.stopPropagation();
            onChange(o.key);
          }}
          className={cn(
            "rounded-[4px] px-2 py-0.5 text-[11px] font-medium transition-colors",
            value === o.key
              ? "bg-[var(--ink)] text-[var(--paper)]"
              : "text-text-mute hover:text-text",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
