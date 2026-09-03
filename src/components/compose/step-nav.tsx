"use client";

import { Check, Lock } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { StepDef, StepKey, StepState } from "@/lib/compose/steps";

/**
 * The progress rail for the guided sequence.
 *
 * Three things have to be readable at a glance: where you are, what you have
 * already filled in, and what you are allowed to leave alone. So a done step
 * carries a tick, an optional one says so in words rather than by being
 * greyed, and a step you have not reached yet is dimmed and not clickable.
 *
 * "Not reached yet" is the whole of the guiding. After the first pass every
 * step is unlocked and this becomes a set of tabs.
 */
export function StepNav({
  steps,
  current,
  stateOf,
  reachable,
  onGo,
}: {
  steps: StepDef[];
  current: StepKey;
  stateOf: (key: StepKey) => StepState;
  /** True once the creator has been here, or has finished the first pass. */
  reachable: (key: StepKey) => boolean;
  onGo: (key: StepKey) => void;
}) {
  return (
    <nav aria-label="Compose steps" className="border-b border-border">
      <ol className="flex gap-1 overflow-x-auto px-3 py-2 [scrollbar-width:none] md:px-6">
        {steps.map((s, i) => {
          const active = s.key === current;
          const state = stateOf(s.key);
          const open = reachable(s.key);
          return (
            <li key={s.key} className="shrink-0">
              <button
                type="button"
                onClick={() => open && onGo(s.key)}
                disabled={!open}
                aria-current={active ? "step" : undefined}
                title={open ? s.blurb : "Reach this step to open it"}
                className={cn(
                  "focus-ring flex items-center gap-1.5 rounded-[var(--radius-btn)] border px-2.5 py-1.5 transition-colors",
                  active
                    ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                    : open
                      ? "border-border text-text-mute hover:border-border-strong hover:text-text"
                      : "cursor-not-allowed border-transparent text-text-faint",
                )}
              >
                <span
                  className={cn(
                    "num text-[10px] tabular-nums",
                    active ? "opacity-70" : "text-text-faint",
                  )}
                >
                  {i + 1}
                </span>
                <span className="num text-[11px] uppercase tracking-[0.12em]">{s.label}</span>
                {!open ? (
                  <Lock size={10} aria-hidden className="opacity-60" />
                ) : state === "done" ? (
                  <Check
                    size={12}
                    aria-hidden
                    className={active ? "opacity-90" : "text-[var(--verdigris)]"}
                  />
                ) : s.optional ? (
                  <span
                    className={cn(
                      "num text-[9px] uppercase tracking-[0.1em]",
                      active ? "opacity-70" : "text-text-faint",
                    )}
                  >
                    optional
                  </span>
                ) : (
                  <span
                    className={cn(
                      "num text-[9px] uppercase tracking-[0.1em]",
                      active ? "opacity-70" : "text-text-faint",
                    )}
                  >
                    empty
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The heading above each step's content, and the one button under it.
 *
 * One forward button, whose label is what pressing it will do: Skip on an
 * optional step that holds nothing, Continue otherwise. When Continue cannot
 * advance, the reason sits beside it in words until it is fixed, rather than
 * the button greying out and leaving the creator to guess why.
 */
export function StepFrame({
  step,
  index,
  total,
  onBack,
  next,
  note,
  children,
}: {
  step: StepDef;
  index: number;
  total: number;
  onBack: (() => void) | null;
  /** The forward button. Null on the last step, which publishes instead. */
  next: { label: string; onPress: () => void } | null;
  /** Why the last press did not advance. Cleared once it is no longer true. */
  note: string | null;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={step.label}>
      <div className="mb-5">
        <p className="num text-[10px] uppercase tracking-[0.18em] text-text-faint">
          Step {index + 1} of {total}
          {step.optional ? " · optional" : ""}
        </p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{step.label}</h2>
        <p className="mt-1 max-w-[62ch] text-[0.875rem] leading-relaxed text-text-mute">
          {step.blurb}
        </p>
      </div>

      {children}

      {/* The buttons sit under the work rather than at the bottom of the
          viewport: a short step should end where its content ends. */}
      <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="focus-ring rounded-[var(--radius-btn)] border border-border px-3 py-2 text-[0.8125rem] text-text-mute transition-colors hover:text-text"
          >
            Back
          </button>
        ) : null}
        <div className="ml-auto flex min-w-0 items-center gap-3">
          {note ? (
            <p role="alert" className="max-w-[44ch] text-right text-[0.8125rem] leading-snug text-[var(--rust)]">
              {note}
            </p>
          ) : null}
          {next ? (
            <button
              type="button"
              onClick={next.onPress}
              className="focus-ring shrink-0 rounded-[var(--radius-btn)] bg-[var(--ink)] px-4 py-2 text-[0.8125rem] font-medium text-[var(--paper)] transition-opacity hover:opacity-90"
            >
              {next.label}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
