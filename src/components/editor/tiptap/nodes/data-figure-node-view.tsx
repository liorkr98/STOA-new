"use client";

import { useState } from "react";
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, ArrowUpRight, FileSearch, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { FilingFigure, SourceRef } from "@/lib/market/types";
import { SaveToNotebookButton } from "@/components/notebook/save-to-notebook-button";

/**
 * dataFigureNode -- a single sourced figure (e.g. "Revenue TTM $24.3B, +18%
 * YoY"). Carries its source visibly so the fact-checker/citation ledger can see
 * it. A10 adds "find in filings": pull the value straight from an EDGAR concept
 * so the figure arrives with structured provenance (sourceRef).
 */

const COMMON_CONCEPTS: { label: string; concept: string }[] = [
  { label: "Revenue", concept: "RevenueFromContractWithCustomerExcludingAssessedTax" },
  { label: "Net income", concept: "NetIncomeLoss" },
  { label: "Diluted EPS", concept: "EarningsPerShareDiluted" },
  { label: "Operating income", concept: "OperatingIncomeLoss" },
  { label: "Total assets", concept: "Assets" },
  { label: "Total liabilities", concept: "Liabilities" },
  { label: "Stockholders equity", concept: "StockholdersEquity" },
  { label: "Cash & equivalents", concept: "CashAndCashEquivalentsAtCarryingValue" },
];

function stop(e: React.SyntheticEvent) {
  e.stopPropagation();
}

function fmtValue(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return v.toFixed(2);
}

function periodLabel(f: FilingFigure): string {
  if (f.fp && f.fy) return `${f.fp} ${f.fy}`;
  return f.periodEnd;
}

export function DataFigureNodeView({
  node,
  updateAttributes,
  deleteNode,
  selected,
  editor,
}: NodeViewProps) {
  const isEditable = editor?.isEditable ?? true;
  const label = String(node.attrs.label ?? "");
  const value = String(node.attrs.value ?? "");
  const note = String(node.attrs.note ?? "");
  const source = String(node.attrs.source ?? "");
  const sourceRef = (node.attrs.sourceRef as SourceRef | null) ?? null;

  const [pickerOpen, setPickerOpen] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [concept, setConcept] = useState(COMMON_CONCEPTS[0].concept);
  const [results, setResults] = useState<FilingFigure[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "auth">("idle");

  async function search() {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    setStatus("loading");
    setResults(null);
    try {
      const res = await fetch(
        `/api/market/concept?symbol=${encodeURIComponent(sym)}&concept=${encodeURIComponent(concept)}`,
      );
      if (res.status === 401) {
        setStatus("auth");
        return;
      }
      if (!res.ok) {
        setStatus("empty");
        return;
      }
      const body = (await res.json()) as { figures: FilingFigure[] };
      setResults(body.figures);
      setStatus(body.figures.length ? "idle" : "empty");
    } catch {
      setStatus("empty");
    }
  }

  function chooseFigure(f: FilingFigure) {
    const sym = symbol.trim().toUpperCase();
    const conceptLabel = COMMON_CONCEPTS.find((c) => c.concept === concept)?.label ?? f.concept;
    const url = `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${encodeURIComponent(sym)}&type=${encodeURIComponent(f.form ?? "")}&dateb=&owner=include&count=40`;
    const ref: SourceRef = {
      kind: "filing",
      provider: "edgar",
      concept: f.concept,
      accession: f.accession ?? undefined,
      asOf: f.filed ?? f.periodEnd,
      url,
    };
    updateAttributes({
      label: conceptLabel,
      value: fmtValue(f.value),
      note: periodLabel(f),
      source: url,
      sourceRef: ref,
    });
    setPickerOpen(false);
    setResults(null);
  }

  function clearRef() {
    updateAttributes({ sourceRef: null });
  }

  // Reading mode: static figure with its source line.
  if (!isEditable) {
    return (
      <NodeViewWrapper
        contentEditable={false}
        className="my-4 max-w-sm rounded-[var(--radius-card)] border border-border bg-surface p-4"
      >
        {label && <span className="t-eyebrow">{label}</span>}
        <div className="mt-1 flex items-baseline gap-2">
          {value && <span className="num text-2xl font-semibold">{value}</span>}
          {note && <span className="num text-sm text-[var(--up)]">{note}</span>}
        </div>
        {(sourceRef || source) && (
          <div className="mt-2 border-t border-border pt-2">
            {sourceRef ? (
              <a
                href={sourceRef.url ?? source}
                target="_blank"
                rel="noopener noreferrer"
                className="t-meta inline-flex items-center gap-1 text-[11px] hover:text-accent"
              >
                {(sourceRef.provider ?? "source").toUpperCase()}
                {sourceRef.accession ? ` - ${sourceRef.accession}` : ""}
                <ArrowUpRight size={11} />
              </a>
            ) : (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="t-meta inline-flex items-center gap-1 text-[11px] hover:text-accent"
              >
                Source
                <ArrowUpRight size={11} />
              </a>
            )}
          </div>
        )}
        <div className="mt-2">
          <SaveToNotebookButton
            compact
            entry={{
              kind: "figure",
              payload: { label, value, note },
              source: sourceRef
                ? { url: sourceRef.url, accession: sourceRef.accession, asOf: sourceRef.asOf }
                : source
                  ? { url: source }
                  : null,
            }}
          />
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "group relative my-4 max-w-sm select-none rounded-[var(--radius-card)] border bg-surface p-4",
        selected ? "border-accent" : "border-border",
      )}
      onMouseDown={stop}
    >
      <div className="absolute right-2 top-2 flex opacity-0 transition-opacity group-hover:opacity-100">
        <button
          type="button"
          aria-label="Find in filings"
          onMouseDown={stop}
          onClick={() => setPickerOpen((o) => !o)}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-accent focus-ring"
        >
          <FileSearch size={14} />
        </button>
        <button
          type="button"
          aria-label="Delete figure"
          onMouseDown={stop}
          onClick={() => deleteNode()}
          className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <input
        value={label}
        onChange={(e) => updateAttributes({ label: e.target.value })}
        onMouseDown={stop}
        placeholder="Metric"
        className="t-eyebrow w-full bg-transparent uppercase focus:outline-none placeholder:text-text-faint placeholder:normal-case"
      />
      <div className="mt-1 flex items-baseline gap-2">
        <input
          value={value}
          onChange={(e) => updateAttributes({ value: e.target.value })}
          onMouseDown={stop}
          placeholder="Value"
          className="num w-full max-w-[9ch] bg-transparent text-2xl font-semibold focus:outline-none placeholder:text-text-faint"
        />
        <input
          value={note}
          onChange={(e) => updateAttributes({ note: e.target.value })}
          onMouseDown={stop}
          placeholder="context"
          className="num flex-1 bg-transparent text-sm text-[var(--up)] focus:outline-none placeholder:text-text-faint"
        />
      </div>

      {sourceRef ? (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
          <span className="t-meta flex-1 truncate text-[11px]">
            {(sourceRef.provider ?? "source").toUpperCase()}
            {sourceRef.concept ? ` - ${sourceRef.concept}` : ""}
            {sourceRef.asOf ? ` - filed ${sourceRef.asOf}` : ""}
          </span>
          {sourceRef.url && (
            <a
              href={sourceRef.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open filing"
              onMouseDown={stop}
              className="text-text-faint transition-colors hover:text-accent"
            >
              <ArrowUpRight size={13} />
            </a>
          )}
          <button
            type="button"
            aria-label="Clear filing source"
            onMouseDown={stop}
            onClick={clearRef}
            className="text-text-faint transition-colors hover:text-[var(--down)]"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
          <input
            value={source}
            onChange={(e) => updateAttributes({ source: e.target.value })}
            onMouseDown={stop}
            placeholder="Source URL"
            className="t-meta flex-1 bg-transparent text-[11px] focus:outline-none placeholder:text-text-faint"
          />
          {source && (
            <a
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open source"
              onMouseDown={stop}
              className="text-text-faint transition-colors hover:text-accent"
            >
              <ArrowUpRight size={13} />
            </a>
          )}
        </div>
      )}

      {pickerOpen && (
        <div className="mt-2 rounded-[var(--radius-btn)] border border-border bg-bg p-2">
          <div className="flex items-center gap-1.5">
            <input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), search())}
              onMouseDown={stop}
              placeholder="Ticker"
              className="num h-7 w-16 rounded-[var(--radius-btn)] border border-border bg-surface px-1.5 text-sm font-semibold focus:outline-none"
            />
            <select
              value={concept}
              onMouseDown={stop}
              onChange={(e) => setConcept(e.target.value)}
              className="h-7 flex-1 rounded-[var(--radius-btn)] border border-border bg-surface px-1.5 text-[11px] text-text-mute focus-ring"
            >
              {COMMON_CONCEPTS.map((c) => (
                <option key={c.concept} value={c.concept}>
                  {c.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onMouseDown={stop}
              onClick={search}
              className="h-7 rounded-[var(--radius-btn)] bg-accent px-2 text-[11px] font-semibold text-accent-ink focus-ring"
            >
              Search
            </button>
          </div>
          <div className="mt-2 max-h-40 overflow-auto scroll-area">
            {status === "loading" && <p className="t-meta px-1 text-[11px]">Searching filings...</p>}
            {status === "auth" && (
              <p className="t-meta px-1 text-[11px]">Sign in to search filings</p>
            )}
            {status === "empty" && (
              <p className="t-meta px-1 text-[11px]">No values for that concept</p>
            )}
            {results?.map((f) => (
              <button
                key={`${f.accession}-${f.periodEnd}`}
                type="button"
                onMouseDown={stop}
                onClick={() => chooseFigure(f)}
                className="flex w-full items-center justify-between gap-2 rounded-[var(--radius-btn)] px-2 py-1 text-left text-sm hover:bg-surface-2"
              >
                <span className="num text-text-mute">{periodLabel(f)}</span>
                <span className="num font-medium">{fmtValue(f.value)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
}
