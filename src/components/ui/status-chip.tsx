import { Clock, Pencil, BadgeCheck, BadgeX } from "lucide-react";
import { cn } from "@/lib/design/cn";

export type ReportStatus = "draft" | "open" | "hit" | "miss";

/**
 * Report/call status everywhere: My Reports list, feed cards, report
 * headers. Always icon + label, never color alone. Hit/Miss use sentiment
 * tokens (verdigris/rust); draft/open stay neutral ink.
 */
export function StatusChip({
  status,
  resolvesAt,
  className,
}: {
  status: ReportStatus;
  resolvesAt?: Date;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-[var(--r-tag)] px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide uppercase";

  if (status === "draft") {
    return (
      <span className={cn(base, "border border-dashed border-border-strong text-text-mute", className)}>
        <Pencil size={11} strokeWidth={2.5} aria-hidden />
        Draft
      </span>
    );
  }

  if (status === "open") {
    return (
      <span className={cn(base, "border border-border text-text-mute", className)}>
        <Clock size={11} strokeWidth={2.5} aria-hidden />
        {resolvesAt
          ? `Resolves ${resolvesAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
          : "Open"}
      </span>
    );
  }

  const hit = status === "hit";
  const color = hit ? "var(--verdigris)" : "var(--rust)";

  return (
    <span
      className={cn(base, "border", className)}
      style={{
        color,
        borderColor: `color-mix(in srgb, ${color} 35%, transparent)`,
        background: `color-mix(in srgb, ${color} 10%, transparent)`,
      }}
    >
      {hit ? (
        <BadgeCheck size={12} strokeWidth={2.5} aria-hidden />
      ) : (
        <BadgeX size={12} strokeWidth={2.5} aria-hidden />
      )}
      {hit ? "Hit" : "Miss"}
    </span>
  );
}
