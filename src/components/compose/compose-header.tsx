"use client";

import { cn } from "@/lib/design/cn";
import { ComposeBackLink } from "@/components/compose/compose-back-link";

/**
 * The bar across the top of Compose, on the picker and in the workspace:
 * the way back, the wordmark, and where you are. What sits on the
 * right is the caller's (the draft's save state, in the workspace).
 *
 * Back pops the in-app stack (Feed, Studio, the type picker) the way
 * Instagram and CapCut do; it only falls through to Studio when Compose
 * was the first page.
 *
 * It is one block in the flow. Nothing here sticks: the columns under it
 * scroll on their own, so it never has to.
 */
export function ComposeHeader({
  crumb,
  children,
  className,
}: {
  /** After COMPOSE, e.g. "Verdict". */
  crumb?: string | null;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-b border-border bg-paper px-3 py-2.5 md:gap-4 md:px-6",
        className,
      )}
    >
      <ComposeBackLink />
      <span aria-hidden className="h-4 w-px bg-border" />
      <span className="font-display text-[1.0625rem] font-semibold tracking-[0.22em] text-text">
        STOA
      </span>
      <span className="num min-w-0 truncate text-[10px] uppercase tracking-[0.16em] text-text-faint">
        Compose{crumb ? ` · ${crumb}` : ""}
      </span>
      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-3">{children}</div>
    </div>
  );
}
