"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/design/cn";

interface CompareRow {
  label: string;
  values: string[];
}

/**
 * compareNode -- a peer-comparison table for 2-4 tickers (P/E, margin,
 * growth...). A financial-report staple a generic editor has no concept of.
 * Tickers and rows are structured attributes, right-aligned Plex Mono values.
 */
export function CompareNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const tickers = (node.attrs.tickers as string[]) ?? [];
  const rows = (node.attrs.rows as CompareRow[]) ?? [];

  function setTicker(i: number, v: string) {
    const next = [...tickers];
    next[i] = v.toUpperCase();
    updateAttributes({ tickers: next });
  }

  function addTicker() {
    if (tickers.length >= 4) return;
    updateAttributes({
      tickers: [...tickers, ""],
      rows: rows.map((r) => ({ ...r, values: [...r.values, ""] })),
    });
  }

  function removeTicker(i: number) {
    if (tickers.length <= 2) return;
    updateAttributes({
      tickers: tickers.filter((_, j) => j !== i),
      rows: rows.map((r) => ({ ...r, values: r.values.filter((_, j) => j !== i) })),
    });
  }

  function setRowLabel(i: number, v: string) {
    const next = rows.map((r, j) => (j === i ? { ...r, label: v } : r));
    updateAttributes({ rows: next });
  }

  function setRowValue(ri: number, vi: number, v: string) {
    const next = rows.map((r, j) =>
      j === ri ? { ...r, values: r.values.map((x, k) => (k === vi ? v : x)) } : r,
    );
    updateAttributes({ rows: next });
  }

  function addRow() {
    updateAttributes({ rows: [...rows, { label: "", values: tickers.map(() => "") }] });
  }

  function removeRow(i: number) {
    updateAttributes({ rows: rows.filter((_, j) => j !== i) });
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "group my-4 select-none overflow-hidden rounded-[var(--radius-card)] border bg-surface",
        selected ? "border-accent" : "border-border",
      )}
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <p className="t-eyebrow">Peer comparison</p>
        <button
          type="button"
          aria-label="Delete comparison"
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint opacity-0 transition-opacity hover:text-[var(--down)] focus-ring group-hover:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="w-40 px-3 py-2 text-left" />
            {tickers.map((t, i) => (
              <th key={i} className="px-3 py-2 text-right">
                <input
                  value={t}
                  onChange={(e) => setTicker(i, e.target.value)}
                  placeholder="TICK"
                  className="num w-16 bg-transparent text-right font-semibold focus:outline-none placeholder:text-text-faint"
                />
                {tickers.length > 2 && (
                  <button
                    type="button"
                    aria-label={`Remove ${t || "ticker"}`}
                    onClick={() => removeTicker(i)}
                    className="ml-1 text-text-faint opacity-0 transition-opacity hover:text-[var(--down)] group-hover:opacity-100"
                  >
                    &times;
                  </button>
                )}
              </th>
            ))}
            {tickers.length < 4 && (
              <th className="px-2">
                <button
                  type="button"
                  aria-label="Add ticker"
                  onClick={addTicker}
                  className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-accent focus-ring"
                >
                  <Plus size={13} />
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className="border-b border-border last:border-0">
              <td className="px-3 py-1.5">
                <input
                  value={row.label}
                  onChange={(e) => setRowLabel(ri, e.target.value)}
                  placeholder="Metric"
                  className="w-full bg-transparent text-text-mute focus:outline-none placeholder:text-text-faint"
                />
              </td>
              {row.values.map((val, vi) => (
                <td key={vi} className="px-3 py-1.5 text-right">
                  <input
                    value={val}
                    onChange={(e) => setRowValue(ri, vi, e.target.value)}
                    placeholder="-"
                    className="num w-full bg-transparent text-right focus:outline-none placeholder:text-text-faint"
                  />
                </td>
              ))}
              {tickers.length < 4 && <td />}
              <td className="pr-1">
                <button
                  type="button"
                  aria-label="Remove row"
                  onClick={() => removeRow(ri)}
                  className="text-text-faint opacity-0 transition-opacity hover:text-[var(--down)] group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-left text-xs text-text-mute transition-colors hover:text-text focus-ring"
      >
        <Plus size={13} />
        Add metric
      </button>
    </NodeViewWrapper>
  );
}
