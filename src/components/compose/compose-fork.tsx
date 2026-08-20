"use client";

import { Video, PenLine } from "lucide-react";
import { cn } from "@/lib/design/cn";

export type ComposeMode = "video" | "written";

/**
 * The first thing on the compose screen: one question, two answers. Video
 * publications reach the Feed and Explore; written work reaches the analyst's
 * profile and can surface on Today. That consequence is stated at the fork so
 * the creator understands what they are choosing. Once answered it collapses
 * to a single line with a Change control; switching never discards what has
 * been written, because the editor keeps every field mounted.
 */
export function ComposeFork({
  mode,
  onChoose,
  className,
}: {
  mode: ComposeMode | null;
  onChoose: (m: ComposeMode) => void;
  className?: string;
}) {
  if (mode) {
    return (
      <div className={cn("mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3", className)}>
        <div className="flex items-center gap-2.5">
          {mode === "video" ? <Video size={14} className="text-text-mute" aria-hidden /> : <PenLine size={14} className="text-text-mute" aria-hidden />}
          <span className="num text-[11px] uppercase tracking-[0.16em] text-text">
            {mode === "video" ? "Publishing with video" : "Written publication"}
          </span>
          <span className="num hidden text-[10px] uppercase tracking-[0.14em] text-text-faint sm:inline">
            {mode === "video" ? "· reaches the Feed and Explore" : "· reaches your profile and Today"}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onChoose(mode === "video" ? "written" : "video")}
          className="num focus-ring rounded text-[11px] uppercase tracking-[0.14em] text-text-mute underline underline-offset-4 hover:text-text"
        >
          {mode === "video" ? "Switch to written" : "Add video instead"}
        </button>
      </div>
    );
  }

  return (
    <section aria-label="Are you publishing with video?" className={cn("mb-8 rounded-[var(--radius-card)] border border-[var(--ink)] bg-surface p-5 md:p-6", className)}>
      <p className="t-eyebrow">Before you start</p>
      <h2 className="mt-1.5 font-display text-[1.5rem] font-semibold leading-tight tracking-tight md:text-[1.75rem]">
        Are you publishing with video?
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onChoose("video")}
          className="focus-ring group flex items-start gap-3 rounded-[var(--radius-btn)] border border-border bg-bg p-4 text-left transition-colors hover:border-[var(--ink)]"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[var(--ink)] text-[var(--paper)]">
            <Video size={16} strokeWidth={1.6} aria-hidden />
          </span>
          <span>
            <span className="block font-display text-[1.125rem] font-semibold tracking-tight">Yes, with video</span>
            <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-mute">
              Load or record a clip, then the editor. A headline and tags are required; cards and a written report are optional.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onChoose("written")}
          className="focus-ring group flex items-start gap-3 rounded-[var(--radius-btn)] border border-border bg-bg p-4 text-left transition-colors hover:border-[var(--ink)]"
        >
          <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full border border-[var(--ink)] text-text">
            <PenLine size={16} strokeWidth={1.6} aria-hidden />
          </span>
          <span>
            <span className="block font-display text-[1.125rem] font-semibold tracking-tight">No, written only</span>
            <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-mute">
              Straight to the editor: headline and body. Cards, graphs and figures are optional.
            </span>
          </span>
        </button>
      </div>
      <p className="num mt-4 text-[10px] uppercase tracking-[0.16em] text-text-mute">
        Video reaches the Feed and Explore · written work reaches your profile and Today
      </p>
    </section>
  );
}
