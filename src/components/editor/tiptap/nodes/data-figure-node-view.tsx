"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * dataFigureNode -- a single sourced figure (e.g. "Revenue TTM $24.3B,
 * +18% YoY"). Carries its source visibly so the fact-checker can see it and
 * so AI-inserted data (Layer 4) arrives pre-cited. Editable inline; the
 * source travels with the node because it is a structured attribute.
 */
export function DataFigureNodeView({ node, updateAttributes, deleteNode, selected }: NodeViewProps) {
  const label = String(node.attrs.label ?? "");
  const value = String(node.attrs.value ?? "");
  const note = String(node.attrs.note ?? "");
  const source = String(node.attrs.source ?? "");

  return (
    <NodeViewWrapper
      contentEditable={false}
      className={cn(
        "group relative my-4 max-w-sm select-none rounded-[var(--radius-card)] border bg-surface p-4",
        selected ? "border-accent" : "border-border",
      )}
    >
      <button
        type="button"
        aria-label="Delete figure"
        onClick={() => deleteNode()}
        className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-[var(--radius-btn)] text-text-faint opacity-0 transition-opacity hover:text-[var(--down)] focus-ring group-hover:opacity-100"
      >
        <Trash2 size={14} />
      </button>

      <input
        value={label}
        onChange={(e) => updateAttributes({ label: e.target.value })}
        placeholder="Metric"
        className="t-eyebrow w-full bg-transparent uppercase focus:outline-none placeholder:text-text-faint placeholder:normal-case"
      />
      <div className="mt-1 flex items-baseline gap-2">
        <input
          value={value}
          onChange={(e) => updateAttributes({ value: e.target.value })}
          placeholder="Value"
          className="num w-full max-w-[8ch] bg-transparent text-2xl font-semibold focus:outline-none placeholder:text-text-faint"
        />
        <input
          value={note}
          onChange={(e) => updateAttributes({ note: e.target.value })}
          placeholder="context"
          className="num flex-1 bg-transparent text-sm text-[var(--up)] focus:outline-none placeholder:text-text-faint"
        />
      </div>
      <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2">
        <input
          value={source}
          onChange={(e) => updateAttributes({ source: e.target.value })}
          placeholder="Source URL"
          className="t-meta flex-1 bg-transparent text-[11px] focus:outline-none placeholder:text-text-faint"
        />
        {source && (
          <a
            href={source}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open source"
            className="text-text-faint transition-colors hover:text-accent"
          >
            <ArrowUpRight size={13} />
          </a>
        )}
      </div>
    </NodeViewWrapper>
  );
}
