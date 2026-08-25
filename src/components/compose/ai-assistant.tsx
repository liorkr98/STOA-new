"use client";

import { Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { AI_COST } from "@/lib/ai/credits";

/**
 * The assistant, in the toolbox rail.
 *
 * It sits on the left because everything it does is creation: it writes cards
 * and it works on the research. Nothing it does is a setting, so it does not
 * belong on the publish side of the screen.
 *
 * Each entry seeds the Ask panel rather than firing on click. A paid tool
 * should show its price and then let the analyst decide, not spend first.
 */

export interface AssistantAction {
  key: string;
  label: string;
  prompt: string;
  cost?: number;
}

export const ASSISTANT_ACTIONS: AssistantAction[] = [
  {
    key: "cards-from-thesis",
    label: "Generate cards from the thesis",
    prompt:
      "Read my thesis and lay it out as evidence cards: the claim, the steps to my target, what would prove me wrong, and the best objection with my answer.",
  },
  {
    key: "metric",
    label: "Insert a metric",
    prompt: "Insert a sourced figure for the ticker I am writing about, with its provenance.",
  },
  {
    key: "chart",
    label: "Build a chart",
    prompt: "Build a chart for the ticker I am writing about and insert it.",
  },
  {
    key: "structure",
    label: "Structure my thesis",
    prompt: "Structure what I have written into sections with headings, keeping my words.",
  },
  {
    key: "tighten",
    label: "Tighten this",
    prompt: "Tighten the selected passage without changing what it claims.",
  },
  {
    key: "headline",
    label: "Suggest a headline",
    prompt: "Suggest three headlines for this publication, in my voice.",
  },
];

export const DEVILS_ADVOCATE: AssistantAction = {
  key: "devils-advocate",
  label: "Devil's Advocate",
  prompt:
    "Argue against my thesis as hard as you can. Give me the strongest case that I am wrong, with the evidence that would support it.",
  cost: AI_COST.devilsAdvocate,
};

export function AiAssistant({
  onRun,
  credits,
}: {
  onRun: (action: AssistantAction) => void;
  credits: number;
}) {
  const canAfford = credits >= (DEVILS_ADVOCATE.cost ?? 0);

  return (
    <section aria-label="AI assistant" className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="t-eyebrow">Assistant</h2>
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
          {credits} credits
        </span>
      </div>

      <ul className="mt-2 space-y-1">
        {ASSISTANT_ACTIONS.map((a) => (
          <li key={a.key}>
            <button
              type="button"
              onClick={() => onRun(a)}
              className="focus-ring flex w-full items-center gap-2 rounded-[var(--radius-btn)] border border-border bg-surface px-2.5 py-1.5 text-left text-[0.8125rem] text-text transition-colors hover:border-border-strong"
            >
              <Sparkles size={13} className="shrink-0 text-text-faint" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{a.label}</span>
            </button>
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => onRun(DEVILS_ADVOCATE)}
            className={cn(
              "focus-ring flex w-full items-center gap-2 rounded-[var(--radius-btn)] border px-2.5 py-1.5 text-left text-[0.8125rem] transition-colors",
              canAfford
                ? "border-[var(--plum)] bg-[color-mix(in_srgb,var(--plum)_10%,transparent)] text-text hover:border-[var(--plum)]"
                : "border-border bg-surface text-text-mute",
            )}
          >
            <Swords size={13} className="shrink-0 text-[var(--plum)]" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{DEVILS_ADVOCATE.label}</span>
            <span className="num shrink-0 rounded-[var(--radius-tag)] border border-[var(--plum)] px-1 py-px text-[10px] uppercase tracking-[0.1em] text-[var(--plum)]">
              {DEVILS_ADVOCATE.cost} cr
            </span>
          </button>
        </li>
      </ul>

      {canAfford ? null : (
        <p className="num mt-1.5 text-[10px] uppercase leading-relaxed tracking-[0.12em] text-text-faint">
          Not enough credits · top up in Wallet
        </p>
      )}
    </section>
  );
}
