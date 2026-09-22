"use client";

import { ChevronRight, Film, FileText, Layers, Target } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { FeatureDef, FeatureKey } from "@/lib/compose/steps";

/**
 * The features menu, on the publish screen and nowhere else.
 *
 * What a publication may add on top of its spine is a menu nobody has to
 * walk past: each row says what the feature is and whether it has been
 * added, opening one goes into that feature's editor, and Done brings the
 * creator back here. Never a step in a sequence.
 */

const ICONS: Record<FeatureKey, React.ReactNode> = {
  call: <Target size={16} strokeWidth={1.6} aria-hidden />,
  cards: <Layers size={16} strokeWidth={1.6} aria-hidden />,
  thesis: <FileText size={16} strokeWidth={1.6} aria-hidden />,
  video: <Film size={16} strokeWidth={1.6} aria-hidden />,
};

export interface FeatureRow {
  def: FeatureDef;
  /**
   * What has been added, in a few words ("NVDA · long", "3 cards",
   * "1,840 words"), or null when nothing has.
   */
  added: string | null;
  /** The feature was opened and left half done; the reason, in words. */
  halfDone: string | null;
  /** The row cannot be opened (a frozen call on a live publication). */
  locked?: boolean;
}

export function FeaturesMenu({
  typeNoun,
  rows,
  onOpen,
}: {
  /** "verdict", for the heading. */
  typeNoun: string;
  rows: FeatureRow[];
  onOpen: (key: FeatureKey) => void;
}) {
  return (
    <section
      aria-label={`Add to this ${typeNoun}`}
      className="rounded-[var(--radius-card)] border border-border bg-surface"
    >
      <div className="border-b border-border px-4 py-3">
        <p className="t-eyebrow">Add to this {typeNoun}</p>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const state = row.halfDone
            ? { label: "Half done", tone: "bad" as const }
            : row.added
              ? { label: `Added · ${row.added}`, tone: "on" as const }
              : { label: "Not added", tone: "off" as const };
          return (
            <li key={row.def.key}>
              <button
                type="button"
                onClick={() => !row.locked && onOpen(row.def.key)}
                disabled={row.locked}
                className={cn(
                  "focus-ring flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors",
                  row.locked ? "cursor-default" : "hover:bg-surface-2",
                )}
              >
                <span className="mt-0.5 shrink-0 text-text-mute">{ICONS[row.def.key]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="text-[0.9375rem] font-medium text-text">{row.def.label}</span>
                    <span
                      className={cn(
                        "num text-[10px] uppercase tracking-[0.14em]",
                        state.tone === "on"
                          ? "text-[var(--verdigris)]"
                          : state.tone === "bad"
                            ? "text-[var(--rust)]"
                            : "text-text-faint",
                      )}
                    >
                      {state.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-[0.8125rem] leading-snug text-text-mute">
                    {row.halfDone ?? row.def.what}
                  </span>
                </span>
                {row.locked ? null : (
                  <ChevronRight size={16} strokeWidth={1.6} aria-hidden className="mt-1 shrink-0 text-text-faint" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
