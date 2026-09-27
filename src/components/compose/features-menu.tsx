"use client";

import { ChevronRight, FileText, Layers, Target } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { FeatureDef, FeatureKey } from "@/lib/compose/steps";
import { Card } from "@/components/ui/card";

/**
 * The features menu, on the publish screen and nowhere else.
 *
 * What a publication may add on top of its spine is a menu nobody has to
 * walk past: each row is the feature's name and its state ("NVDA · Long",
 * "3 cards", "Not added"), nothing more; opening one goes into that
 * feature's editor, and Done brings the creator back here. Never a step in
 * a sequence. The one sentence a row may carry is a refusal: a feature
 * opened and left half done says what is missing, in rust.
 */

const ICONS: Record<FeatureKey, React.ReactNode> = {
  stance: <Target size={16} strokeWidth={1.6} aria-hidden />,
  cards: <Layers size={16} strokeWidth={1.6} aria-hidden />,
  thesis: <FileText size={16} strokeWidth={1.6} aria-hidden />,
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
  /** The row cannot be opened (no stance on a live publication). */
  locked?: boolean;
}

export function FeaturesMenu({
  typeNoun,
  rows,
  onOpen,
}: {
  /** "thesis", for the heading. */
  typeNoun: string;
  rows: FeatureRow[];
  onOpen: (key: FeatureKey) => void;
}) {
  return (
    <Card as="section"
      aria-label={`Add to this ${typeNoun}`}
      className=""
    >
      <div className="border-b border-border px-4 py-3">
        <p className="t-meta">Add to this {typeNoun}</p>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => {
          const state = row.halfDone
            ? { label: "Half done", tone: "bad" as const }
            : row.added
              ? { label: row.added, tone: "on" as const }
              : { label: "Not added", tone: "off" as const };
          return (
            <li key={row.def.key}>
              <button
                type="button"
                onClick={() => !row.locked && onOpen(row.def.key)}
                disabled={row.locked}
                className={cn(
                  "focus-ring flex w-full items-center gap-3 px-4 py-3 text-left transition-colors",
                  row.locked ? "cursor-default" : "hover:bg-surface-2",
                )}
              >
                <span className="shrink-0 text-text-mute">{ICONS[row.def.key]}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                    <span className="text-body font-medium text-text">{row.def.label}</span>
                    <span
                      className={cn(
                        "num text-ticker",
                        state.tone === "on"
                          ? "text-[var(--ok)]"
                          : state.tone === "bad"
                            ? "text-[var(--error)]"
                            : "text-text-mute",
                      )}
                    >
                      {state.label}
                    </span>
                  </span>
                  {row.halfDone ? (
                    <span className="mt-0.5 block text-ticker leading-snug text-[var(--error)]">
                      {row.halfDone}
                    </span>
                  ) : null}
                </span>
                {row.locked ? null : (
                  <ChevronRight size={16} strokeWidth={1.6} aria-hidden className="shrink-0 text-text-mute" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
