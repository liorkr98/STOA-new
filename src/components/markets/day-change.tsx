import { cn } from "@/lib/design/cn";

/**
 * DAY-CHANGE-PENDING
 *
 * The day-change slot. Grep DAY-CHANGE-PENDING to find every call site.
 *
 * The multi-symbol quote path (`getQuotesBatch` -> `Quote`) normalizes market
 * data down to a bare price and drops the previous close, so a day change
 * cannot be computed for any list surface. Krisi is adding it. Until then this
 * renders a neutral grey dash that occupies exactly the width and position the
 * real percentage will take, so no layout shifts when the data lands.
 *
 * Pass a real `percent` wherever one genuinely exists -- the single-symbol
 * `getStockSnapshot` does carry `changePercent` -- and this colours it as
 * sentiment. Passing null is the reserved state, never a gap and never
 * coloured.
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
