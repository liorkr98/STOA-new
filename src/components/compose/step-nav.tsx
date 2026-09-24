"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { StepDef, StepKey, StepState } from "@/lib/compose/steps";

/**
 * The spine's tracker: two numbered marks joined by a hairline.
 *
 * Three things have to be readable at a glance: where you are, what you have
 * already filled in, and what you have not reached. A done step carries a
 * tick in its mark, the current one is filled ink, and a step not yet
 * reached is dimmed and not clickable. "Not reached yet" is the whole of the
 * guiding: after the first pass every step is a tab.
 *
 * The publish screen and the feature editors are not on the spine, so the
 * tracker then shows no current mark; the heading under it says where you are.
 */
export function StepNav({
  steps,
  current,
  stateOf,
  reachable,
  onGo,
}: {
  steps: StepDef[];
  /** Null off the spine (the publish screen, a feature editor). */
  current: StepKey | null;
  stateOf: (key: StepKey) => StepState;
  /** True once the creator has been here, or has finished the first pass. */
  reachable: (key: StepKey) => boolean;
  onGo: (key: StepKey) => void;
}) {
  return (
    <nav aria-label="Steps" className="border-b border-border">
      <ol className="flex items-center gap-2 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] md:gap-3 md:px-6">
        {steps.map((s, i) => {
          const active = s.key === current;
          const done = stateOf(s.key) === "done";
          const open = reachable(s.key);
          return (
            <li key={s.key} className="flex shrink-0 items-center gap-2 md:gap-3">
              {i > 0 ? <span aria-hidden className="h-px w-5 bg-border md:w-8" /> : null}
              <button
                type="button"
                onClick={() => open && onGo(s.key)}
                disabled={!open}
                aria-current={active ? "step" : undefined}
                title={open ? undefined : "Reach this step to open it"}
                className={cn(
                  "focus-ring flex items-center gap-2 rounded-[var(--radius-btn)] py-0.5 pr-1 transition-colors",
                  !open && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "num flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border text-[10px] tabular-nums",
                    active
                      ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)]"
                      : done
                        ? "border-[var(--verdigris)] text-[var(--verdigris)]"
                        : open
                          ? "border-border-strong text-text-mute"
                          : "border-border text-text-faint",
                  )}
                >
                  {done && !active ? <Check size={11} aria-hidden strokeWidth={2.4} /> : i + 1}
                </span>
                <span
                  className={cn(
                    "num text-[11px] uppercase tracking-[0.14em]",
                    active ? "text-text" : open ? "text-text-mute" : "text-text-faint",
                  )}
                >
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * The heading above each screen's content, and the one button under it.
 *
 * One forward button, whose label is what pressing it will do. When it
 * cannot advance, the reason sits beside it in words until it is fixed,
 * rather than the button greying out and leaving the creator to guess why.
 */
export function StepFrame({
  eyebrow,
  title,
  blurb,
  back,
  next,
  note,
  status,
  children,
}: {
  /** "Step 1 of 2", "Add to this thesis · optional", "Ready when you are". */
  eyebrow: string;
  title: string;
  /** Only where a rule has to be stated (a live publication's read-only clip). */
  blurb?: string;
  back: { label: string; onPress: () => void } | null;
  /** The forward button. Null on the publish screen, which publishes instead. */
  next: { label: string; onPress: () => void } | null;
  /** Why the last press did not advance. Cleared once it is no longer true. */
  note: string | null;
  /** The draft's save state, in words, beside the forward button. */
  status?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <div className="mb-5">
        <p className="num text-[10px] uppercase tracking-[0.18em] text-text-faint">{eyebrow}</p>
        <h2 className="mt-1 font-display text-[1.75rem] font-semibold leading-tight tracking-tight md:text-[2.25rem]">
          {title}
        </h2>
        {blurb ? (
          <p className="mt-1.5 max-w-[62ch] text-[0.9375rem] leading-relaxed text-text-mute md:text-[1.0625rem]">
            {blurb}
          </p>
        ) : null}
      </div>

      {children}

      {/* The buttons sit under the work rather than at the bottom of the
          viewport: a short step should end where its content ends. */}
      {back || next || status ? (
        <div className="mt-7 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          {back ? (
            <button
              type="button"
              onClick={back.onPress}
              className="num focus-ring rounded-[var(--radius-btn)] border border-border px-3.5 py-2.5 text-[10px] uppercase tracking-[0.16em] text-text-mute transition-colors hover:border-border-strong hover:text-text"
            >
              {back.label}
            </button>
          ) : null}
          {status ? <div className="min-w-0 flex-1 basis-[10rem]">{status}</div> : null}
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
                className="focus-ring shrink-0 rounded-[var(--radius-btn)] bg-[var(--ink)] px-5 py-2.5 text-[0.9375rem] font-medium text-[var(--paper)] transition-opacity hover:opacity-90"
              >
                {next.label}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
