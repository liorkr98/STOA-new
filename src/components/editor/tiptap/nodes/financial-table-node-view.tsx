"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * financialTableNode -- a real data table (not a prose table): right-aligned
 * Plex Mono numerals in every column past the first, an optional source row.
 * Columns/rows/source serialize as structured attributes.
 */
export function FinancialTableNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
}: NodeViewProps) {
  const columns = (node.attrs.columns as string[]) ?? [];
  const rows = (node.attrs.rows as string[][]) ?? [];
  const source = String(node.attrs.source ?? "");

  function setColumn(i: number, v: string) {
    updateAttributes({ columns: columns.map((c, j) => (j === i ? v : c)) });
  }
  function setCell(ri: number, ci: number, v: string) {
    updateAttributes({
      rows: rows.map((r, j) => (j === ri ? r.map((c, k) => (k === ci ? v : c)) : r)),
    });
  }
  function addColumn() {
    updateAttributes({
      columns: [...columns, ""],
      rows: rows.map((r) => [...r, ""]),
    });
  }
  function addRow() {
    updateAttributes({ rows: [...rows, columns.map(() => "")] });
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
        <p className="t-eyebrow">Table</p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={addColumn}
            className="flex h-7 items-center gap-1 rounded-[var(--radius-btn)] px-2 text-[11px] text-text-mute transition-colors hover:text-text focus-ring"
          >
            <Plus size={12} /> Column
          </button>
          <button
            type="button"
            aria-label="Delete table"
            onClick={() => deleteNode()}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint opacity-0 transition-opacity hover:text-[var(--down)] focus-ring group-hover:opacity-100"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((c, i) => (
                <th key={i} className={cn("px-3 py-2", i === 0 ? "text-left" : "text-right")}>
                  <input
                    value={c}
                    onChange={(e) => setColumn(i, e.target.value)}
                    placeholder="Column"
                    className={cn(
                      "w-full bg-transparent text-xs font-semibold uppercase tracking-wide text-text-mute focus:outline-none placeholder:text-text-mute",
                      i === 0 ? "text-left" : "text-right",
                    )}
                  />
                </th>
              ))}
              <td className="w-6" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-border last:border-0">
                {row.map((cell, ci) => (
                  <td key={ci} className={cn("px-3 py-1.5", ci === 0 ? "text-left" : "text-right")}>
                    <input
                      value={cell}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      placeholder={ci === 0 ? "Label" : "-"}
                      className={cn(
                        "w-full bg-transparent focus:outline-none placeholder:text-text-mute",
                        ci === 0 ? "text-left text-text-mute" : "num text-right",
                      )}
                    />
                  </td>
                ))}
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
      </div>

      <button
        type="button"
        onClick={addRow}
        className="flex w-full items-center gap-1.5 border-t border-border px-3 py-2 text-left text-xs text-text-mute transition-colors hover:text-text focus-ring"
      >
        <Plus size={13} />
        Add row
      </button>

      <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
        <span className="t-eyebrow text-[10px]">Source</span>
        <input
          value={source}
          onChange={(e) => updateAttributes({ source: e.target.value })}
          placeholder="Optional source"
          className="t-meta flex-1 bg-transparent text-[11px] focus:outline-none placeholder:text-text-mute"
        />
      </div>
    </NodeViewWrapper>
  );
}
