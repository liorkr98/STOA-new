import { cn } from "@/lib/design/cn";

/**
 * DAY-CHANGE-PENDING
 *
 * The day-change slot. Grep DAY-CHANGE-PENDING to find every call site.
 *
 * The batch quote path (`getQuotesBatch` -> `Quote.changePercent`) now carries
 * the day change when the provider does (Yahoo does for equities, ETFs,
 * indices and futures). Where a surface has not been wired to it, or the
 * provider returned nothing, this renders a neutral grey dash that occupies
 * exactly the width and position the real percentage will take, so no layout
 * shifts when the data lands. Passing null is the reserved state, never a gap
 * and never coloured; a real percent is coloured as sentiment.
 */
export function DayChange({
  percent,
  size = "sm",
  className,
}: {
  percent: number | null;
  size?: "sm" | "lg";
  className?: string;
}) {
  const base = cn(
    "num inline-block text-right tabular-nums",
    size === "lg" ? "min-w-[5.5rem] text-base" : "min-w-[3.75rem] text-[0.6875rem]",
    className,
  );

  if (percent == null) {
    return (
      <span
        className={cn(base, "text-text-faint")}
        title="Day change is not available yet"
        aria-label="Day change not available"
      >
        &ndash;&ndash;
      </span>
    );
  }

  const up = percent >= 0;
  return (
    <span
      className={cn(base, "font-semibold")}
      style={{ color: up ? "var(--up)" : "var(--down)" }}
    >
      {up ? "+" : ""}
      {percent.toFixed(1)}%
    </span>
  );
}
