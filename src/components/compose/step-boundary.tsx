"use client";

import { Component, type ReactNode } from "react";
import * as Sentry from "@sentry/nextjs";
import { RotateCcw } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

/**
 * A failure inside one step stays inside that step.
 *
 * Without this, a rendering error anywhere in compose fell through to the
 * route's error page, and its Try again remounted the whole workspace at
 * step one: trim, overlays, the chosen clip, the stance, everything held in
 * memory, gone. The workspace holds all of that state above the steps, so
 * a boundary drawn around each step's content lets the step redraw on its
 * own while the rest of the publication, and the creator's place in the
 * sequence, stay exactly where they were.
 */
export class StepErrorBoundary extends Component<
  {
    /** How the step is named to the creator: "Edit video", "this card". */
    label: string;
    /** Runs before the step redraws, so a parent can reseed anything the remount would lose. */
    onReset?: () => void;
    children: ReactNode;
  },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }) {
    Sentry.captureException(error, { extra: { step: this.props.label, componentStack: info.componentStack } });
    console.error(`Compose: the ${this.props.label} step failed to draw`, error);
  }

  retry = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        className="rounded-panel border border-[var(--error-edge)] bg-surface p-4"
      >
        <p className="num text-ticker text-[var(--error)]">
          {this.props.label} hit a problem
        </p>
        <p className="mt-1.5 text-body leading-relaxed text-text">
          Something in this step failed to draw. Nothing else was touched: your other steps,
          your cards, the clip and what is placed on it are still here, and the draft stands as
          of its last save.
        </p>
        <p className="num mt-2 break-words text-ticker leading-snug text-text-mute">
          {error.message || String(error)}
        </p>
        <button
          type="button"
          onClick={this.retry}
          className={buttonClass("ink", "sm", "mt-3")}
        >
          <RotateCcw size={13} aria-hidden /> Redraw this step
        </button>
      </div>
    );
  }
}

declare global {
  interface Window {
    /** Dev only: the step key a fixture wants to crash on its next render. */
    __stoaCrashStep?: string;
  }
}

/**
 * Dev only. Throws during render when a fixture has asked for this step to
 * crash, so the boundary above can be exercised without inventing a real
 * bug. Renders nothing otherwise, and nothing at all in production.
 */
export function DevCrash({ step }: { step: string }) {
  if (
    process.env.NODE_ENV !== "production" &&
    typeof window !== "undefined" &&
    window.__stoaCrashStep === step
  ) {
    throw new Error(`Dev-only crash requested on the ${step} step`);
  }
  return null;
}
