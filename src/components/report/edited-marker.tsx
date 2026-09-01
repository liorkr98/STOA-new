"use client";

import * as Popover from "@radix-ui/react-popover";
import { PencilLine } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { EditSection, ReportEdit } from "@/lib/db/report-edits";

const SECTION_LABEL: Record<EditSection, string> = {
  headline: "Headline",
  dek: "Standfirst",
  thesis: "Thesis",
  cards: "Evidence cards",
  tags: "Tags",
};

function when(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function Change({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="mt-2">
      <p className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{label}</p>
      <p className="user-copy mt-0.5 text-[12px] leading-snug text-text-mute line-through decoration-[var(--rust)]/50">
        {before}
      </p>
      <p className="user-copy mt-0.5 text-[12px] leading-snug text-text">{after}</p>
    </div>
  );
}

/**
 * The EDITED marker.
 *
 * An analyst who corrects themselves in the open is doing the right thing, so
 * this is a mark of transparency and not a warning: brass rather than rust, a
 * pencil rather than an alert, and copy that says the record was corrected
 * rather than implying something was covered up.
 *
 * What it can honestly show differs by section, and the panel says so rather
 * than pretending to a uniform diff. The headline and the standfirst are
 * public everywhere the publication appears, so the before and after are both
 * shown. The thesis sits behind the paywall, so the panel reports that it
 * changed and when, and nothing about what it said.
 */
export function EditedMarker({
  edits,
  className,
  compact = false,
}: {
  edits: ReportEdit[];
  className?: string;
  compact?: boolean;
}) {
  if (edits.length === 0) return null;

  const latest = edits[0]!;

  return (
    <Popover.Root>
      <Popover.Trigger
        className={cn(
          "focus-ring inline-flex items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--brass)]/50 bg-[var(--brass)]/10 px-1.5 py-0.5 text-[var(--brass-ink,var(--text))] transition-colors hover:border-[var(--brass)]",
          className,
        )}
        aria-label={`Edited ${when(latest.editedAt)}. See what changed.`}
      >
        <PencilLine size={11} aria-hidden />
        <span className="num text-[10px] uppercase tracking-[0.14em]">Edited</span>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          className="z-50 w-[min(92vw,22rem)] rounded-[var(--radius-card)] border border-border bg-surface p-3.5 shadow-lg"
        >
          <p className="num text-[10px] uppercase tracking-[0.16em] text-text-faint">
            Revised after publication
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-text-mute">
            The call, its entry price and its resolution can never change. Everything
            below is a change the analyst made in the open.
          </p>

          <ul className="mt-3 space-y-3 border-t border-border pt-3">
            {edits.slice(0, compact ? 3 : 12).map((e) => (
              <li key={e.id}>
                <p className="num text-[11px] text-text">
                  {e.sections.length > 0
                    ? e.sections.map((s) => SECTION_LABEL[s]).join(" · ")
                    : "Edited"}
                </p>
                <p className="num mt-0.5 text-[10px] uppercase tracking-[0.12em] text-text-faint">
                  {when(e.editedAt)}
                </p>

                {e.sections.includes("headline") && e.titleBefore && e.titleAfter ? (
                  <Change label="Headline" before={e.titleBefore} after={e.titleAfter} />
                ) : null}
                {e.sections.includes("dek") && e.dekBefore && e.dekAfter ? (
                  <Change label="Standfirst" before={e.dekBefore} after={e.dekAfter} />
                ) : null}
                {e.sections.includes("thesis") ? (
                  <p className="mt-2 text-[11.5px] leading-snug text-text-mute">
                    The thesis was revised. The wording is not shown here because the
                    text is the publication itself; the previous version is kept.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>

          {edits.length > (compact ? 3 : 12) ? (
            <p className="num mt-3 border-t border-border pt-2 text-[10px] uppercase tracking-[0.12em] text-text-faint">
              {edits.length - (compact ? 3 : 12)} earlier {edits.length - (compact ? 3 : 12) === 1 ? "edit" : "edits"}
            </p>
          ) : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
