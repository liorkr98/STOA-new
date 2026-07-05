"use client";

import type { ReactNode } from "react";
import { FileText, Link2, Plus } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * Snippet card (docs/DESIGN_LANGUAGE.md 7.3). The atomic unit of the Notebook
 * (Part F): a surface card with a source chip (e.g. "10-K p.42"), a highlighted
 * quote, tags, and an insert-into-report action. Presentational; the Notebook
 * board owns data + drag.
 */

export interface SnippetSource {
  /** e.g. "10-K", "Q3 call", "NVDA report". */
  label: string;
  /** e.g. "p.42", a date, or a page. */
  detail?: string;
  href?: string;
}

export interface SnippetCardProps {
  quote: string;
  source?: SnippetSource;
  tags?: string[];
  /** Left accent stripe color (a token var). Defaults to the border hairline. */
  accent?: string;
  onInsert?: () => void;
  footer?: ReactNode;
  className?: string;
}

export function SnippetCard({
  quote,
  source,
  tags,
  accent,
  onInsert,
  footer,
  className,
}: SnippetCardProps) {
  return (
    <article
      className={cn(
        "group flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface p-4",
        className,
      )}
      style={accent ? { borderInlineStartColor: accent, borderInlineStartWidth: 2 } : undefined}
    >
      {source && (
        <div className="flex items-center gap-1.5 text-text-mute">
          <FileText size={13} className="shrink-0 text-text-faint" />
          {source.href ? (
            <a
              href={source.href}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring inline-flex items-center gap-1 text-xs hover:text-text hover:underline"
            >
              <span className="font-medium">{source.label}</span>
              {source.detail && <span className="num text-text-faint">{source.detail}</span>}
              <Link2 size={11} className="text-text-faint" />
            </a>
          ) : (
            <span className="text-xs">
              <span className="font-medium">{source.label}</span>
              {source.detail && <span className="num ml-1 text-text-faint">{source.detail}</span>}
            </span>
          )}
        </div>
      )}

      <blockquote className="border-s-2 border-border-strong ps-3 text-[0.9375rem] leading-relaxed text-text">
        {quote}
      </blockquote>

      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2 py-0.5 text-[0.6875rem] text-text-mute"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2">
        {footer ?? <span />}
        {onInsert && (
          <button
            type="button"
            onClick={onInsert}
            className="focus-ring inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] px-2 py-1 text-xs text-text-mute opacity-0 transition-opacity duration-[var(--dur-1)] hover:bg-surface-2 hover:text-text focus-visible:opacity-100 group-hover:opacity-100"
          >
            <Plus size={13} /> Insert into report
          </button>
        )}
      </div>
    </article>
  );
}
