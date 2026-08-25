"use client";


import { Film, FileText, Plus, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * The canvas is a publication, not a wizard: the headline and dek at the top,
 * then whatever modules this publication has. A publication may have video,
 * research, both, or neither, so a module that has not been added is a quiet
 * row rather than a fork the creator has to answer before they can start.
 *
 * Each header states what the module currently contains, so the creator can
 * see the whole publication without scrolling through it.
 */

export function ModuleHeader({
  icon,
  label,
  state,
  open,
  onToggle,
  onRemove,
}: {
  icon: React.ReactNode;
  label: string;
  /** What the module holds right now, e.g. "0:58" or "1,840 words". */
  state: string | null;
  open: boolean;
  onToggle: () => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-border pb-2">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2 rounded text-left"
      >
        <ChevronDown
          size={14}
          className={cn("shrink-0 text-text-faint transition-transform", !open && "-rotate-90")}
          aria-hidden
        />
        <span className="shrink-0 text-text-mute" aria-hidden>
          {icon}
        </span>
        <span className="num text-[11px] uppercase tracking-[0.16em] text-text">{label}</span>
        {state ? (
          <span className="num flex items-center gap-1 text-[11px] uppercase tracking-[0.14em] text-text-mute">
            <Check size={11} className="text-[var(--verdigris)]" aria-hidden />
            {state}
          </span>
        ) : (
          <span className="num text-[11px] uppercase tracking-[0.14em] text-text-faint">Empty</span>
        )}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="num focus-ring rounded text-[10px] uppercase tracking-[0.12em] text-text-faint hover:text-[var(--rust)]"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

export function AddModuleRow({
  video,
  research,
  onAddVideo,
  onAddResearch,
}: {
  video: boolean;
  research: boolean;
  onAddVideo: () => void;
  onAddResearch: () => void;
}) {
  if (video && research) return null;
  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {video ? null : (
        <button
          type="button"
          onClick={onAddVideo}
          className="focus-ring flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-dashed border-border px-3 py-2 text-[0.8125rem] text-text-mute transition-colors hover:border-[var(--ink)] hover:text-text"
        >
          <Plus size={14} aria-hidden />
          <Film size={14} aria-hidden />
          Add video
        </button>
      )}
      {research ? null : (
        <button
          type="button"
          onClick={onAddResearch}
          className="focus-ring flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-dashed border-border px-3 py-2 text-[0.8125rem] text-text-mute transition-colors hover:border-[var(--ink)] hover:text-text"
        >
          <Plus size={14} aria-hidden />
          <FileText size={14} aria-hidden />
          Add research
        </button>
      )}
    </div>
  );
}

