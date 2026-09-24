import type { HTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";
import type { Direction } from "@/lib/types";

const tagBase =
  "inline-flex items-center gap-1 rounded-[var(--radius-tag)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase";

/** Neutral label. The default tag has no sentiment color. */
export function Tag({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        tagBase,
        "bg-surface-2 text-text-mute border border-border",
        className,
      )}
      {...props}
    />
  );
}

const directionStyle: Record<Direction, string> = {
  long: "text-[var(--up)]",
  short: "text-[var(--down)]",
  hold: "text-text-mute",
};

export function DirectionTag({ direction }: { direction: Direction }) {
  const label = direction === "long" ? "Long" : direction === "short" ? "Short" : "Hold";
  return (
    <span
      className={cn(
        tagBase,
        "border bg-surface-2",
        directionStyle[direction],
      )}
      style={{
        borderColor:
          direction === "hold"
            ? "var(--border)"
            : direction === "long"
              ? "color-mix(in srgb, var(--up) 35%, transparent)"
              : "color-mix(in srgb, var(--down) 35%, transparent)",
      }}
    >
      {label}
    </span>
  );
}
