"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Download } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * The canonical data table (docs/DESIGN_LANGUAGE.md 7.1). Hairline rows, sticky
 * header, right-aligned .num cells, up/down coloring on sentiment columns, an
 * optional summary row, grouping, a column chooser, and CSV export. Reused by
 * the statement block, peer comparison, watchlist, and screener.
 *
 * All figures render in .num (IBM Plex Mono, tabular). Sentiment color appears
 * only on columns explicitly marked `sentiment` -- never generic cells.
 */

export interface Column<T> {
  key: string;
  header: string;
  numeric?: boolean;
  /** Color the cell by sign of its numeric value (up/down). Numeric only. */
  sentiment?: boolean;
  sortable?: boolean;
  /** Raw value for sort / CSV / summary. Defaults to row[key]. */
  accessor?: (row: T) => number | string | null | undefined;
  /** Custom cell content. Falls back to the formatted accessor value. */
  render?: (row: T) => ReactNode;
  /** Numeric display formatter. Defaults to a grouped locale number. */
  format?: (value: number) => string;
}

export type SummaryStat = "avg" | "median" | "min" | "max" | "sum";

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  /** Stable row key. */
  rowKey: (row: T, index: number) => string;
  /** Group rows under header rows keyed by this value. */
  groupBy?: (row: T) => string;
  /** Show a summary row of these stats over numeric columns. */
  summary?: SummaryStat[];
  density?: "comfortable" | "compact";
  /** Filename (without extension) for CSV export. Omit to hide the export button. */
  csvName?: string;
  caption?: string;
  className?: string;
}

type SortState = { key: string; dir: "asc" | "desc" } | null;

function defaultFormat(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function rawValue<T>(col: Column<T>, row: T): number | string | null | undefined {
  if (col.accessor) return col.accessor(row);
  return (row as Record<string, unknown>)[col.key] as number | string | null | undefined;
}

function computeStat(stat: SummaryStat, nums: number[]): number | null {
  if (nums.length === 0) return null;
  switch (stat) {
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    case "median": {
      const sorted = [...nums].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    }
  }
}

function sentimentColor(value: number): string | undefined {
  if (value > 0) return "var(--up)";
  if (value < 0) return "var(--down)";
  return undefined;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  groupBy,
  summary,
  density = "comfortable",
  csvName,
  caption,
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const visibleColumns = columns.filter((c) => !hidden.has(c.key));

  const cellPad = density === "compact" ? "px-3 py-1.5" : "px-4 py-2.5";
  const headPad = density === "compact" ? "px-3 py-2" : "px-4 py-2.5";

  const sortedData = useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => c.key === sort.key);
    if (!col) return data;
    const dir = sort.dir === "asc" ? 1 : -1;
    return [...data].sort((a, b) => {
      const av = rawValue(col, a);
      const bv = rawValue(col, b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [data, sort, columns]);

  const groups = useMemo(() => {
    if (!groupBy) return null;
    const map = new Map<string, T[]>();
    for (const row of sortedData) {
      const g = groupBy(row);
      const bucket = map.get(g);
      if (bucket) bucket.push(row);
      else map.set(g, [row]);
    }
    return map;
  }, [sortedData, groupBy]);

  function toggleSort(key: string) {
    setSort((prev) => {
      if (prev?.key !== key) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  function toggleColumn(key: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function exportCsv() {
    const header = visibleColumns.map((c) => c.header);
    const rows = sortedData.map((row) =>
      visibleColumns.map((c) => {
        const v = rawValue(c, row);
        return v == null ? "" : String(v);
      }),
    );
    const escape = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
    const csv = [header, ...rows].map((r) => r.map((x) => escape(String(x))).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${csvName ?? "table"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderCell(col: Column<T>, row: T) {
    if (col.render) return col.render(row);
    const v = rawValue(col, row);
    if (v == null) return <span className="text-text-faint">-</span>;
    if (col.numeric && typeof v === "number") {
      const color = col.sentiment ? sentimentColor(v) : undefined;
      return (
        <span className="num" style={color ? { color } : undefined}>
          {(col.format ?? defaultFormat)(v)}
        </span>
      );
    }
    return v;
  }

  function renderRow(row: T, index: number) {
    return (
      <tr key={rowKey(row, index)} className="border-t border-border hover:bg-surface-2/60">
        {visibleColumns.map((col) => (
          <td
            key={col.key}
            className={cn(cellPad, "align-middle", col.numeric && "text-right tabular-nums")}
          >
            {renderCell(col, row)}
          </td>
        ))}
      </tr>
    );
  }

  const summaryRow =
    summary && summary.length > 0 ? (
      <tfoot>
        {summary.map((stat) => (
          <tr key={stat} className="border-t border-border-strong bg-surface-2/50">
            {visibleColumns.map((col, i) => {
              if (i === 0) {
                return (
                  <td key={col.key} className={cn(cellPad, "t-eyebrow")}>
                    {stat}
                  </td>
                );
              }
              if (!col.numeric) return <td key={col.key} className={cellPad} />;
              const nums = sortedData
                .map((r) => rawValue(col, r))
                .filter((v): v is number => typeof v === "number");
              const result = computeStat(stat, nums);
              return (
                <td key={col.key} className={cn(cellPad, "text-right")}>
                  {result == null ? (
                    <span className="text-text-faint">-</span>
                  ) : (
                    <span className="num">{(col.format ?? defaultFormat)(result)}</span>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tfoot>
    ) : null;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface",
        className,
      )}
    >
      {(csvName || columns.length > 0) && (
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2">
          {caption ? <span className="t-eyebrow">{caption}</span> : <span />}
          <div className="flex items-center gap-1">
            <details className="relative">
              <summary className="focus-ring flex h-8 cursor-pointer list-none items-center gap-1.5 rounded-[var(--radius-btn)] px-2 text-sm text-text-mute hover:bg-surface-2">
                <Columns3 size={15} /> Columns
              </summary>
              <div className="menu-pop absolute right-0 z-20 mt-1 w-44 rounded-[var(--radius-card)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
                {columns.map((col) => (
                  <label
                    key={col.key}
                    className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-btn)] px-2 py-1.5 text-sm hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={!hidden.has(col.key)}
                      onChange={() => toggleColumn(col.key)}
                    />
                    {col.header}
                  </label>
                ))}
              </div>
            </details>
            {csvName && (
              <button
                type="button"
                onClick={exportCsv}
                className="focus-ring flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] px-2 text-sm text-text-mute hover:bg-surface-2"
              >
                <Download size={15} /> CSV
              </button>
            )}
          </div>
        </div>
      )}

      <div className="scroll-area max-h-[70vh] overflow-auto">
        <table className="data-table w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-surface">
            <tr>
              {visibleColumns.map((col) => {
                const sortable = col.sortable !== false;
                const active = sort?.key === col.key;
                return (
                  <th
                    key={col.key}
                    className={cn(
                      headPad,
                      "t-eyebrow border-b border-border-strong whitespace-nowrap",
                      col.numeric ? "text-right" : "text-left",
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={cn(
                          "focus-ring inline-flex items-center gap-1 hover:text-text",
                          col.numeric && "flex-row-reverse",
                        )}
                      >
                        {col.header}
                        {active ? (
                          sort?.dir === "asc" ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="text-text-faint" />
                        )}
                      </button>
                    ) : (
                      col.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {groups
              ? [...groups.entries()].map(([group, rows]) => (
                  <Fragment key={group}>
                    <tr className="bg-surface-2/70">
                      <td
                        colSpan={visibleColumns.length}
                        className={cn(headPad, "t-eyebrow text-text-mute")}
                      >
                        {group}
                      </td>
                    </tr>
                    {rows.map((row, i) => renderRow(row, i))}
                  </Fragment>
                ))
              : sortedData.map((row, i) => renderRow(row, i))}
          </tbody>
          {summaryRow}
        </table>
      </div>
    </div>
  );
}
