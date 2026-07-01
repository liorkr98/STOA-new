import { Clock, PencilSimple, SealCheck, SealWarning } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/design/cn";

export type ReportStatus = "draft" | "open" | "hit" | "miss";

/**
 * Report/call status everywhere: My Reports list, feed cards, report
 * headers. Always icon + label, never color alone -- Hit and Miss reuse
 * the seal-stamp glyph at a tiny size so the same visual language shows
 * up in the compact chip and the full-size stamp.
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
        <PencilSimple size={11} weight="bold" />
        Draft
      </span>
    );
  }

  if (status === "open") {
    return (
      <span className={cn(base, "border border-border text-text-mute", className)}>
        <Clock size={11} weight="bold" />
        {resolvesAt ? `Resolves ${resolvesAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "Open"}
      </span>
    );
  }

  const hit = status === "hit";
  const color = hit ? "var(--verdigris)" : "var(--rust)";

  return (
    <span
      className={cn(base, "border", className)}
      style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {hit ? <SealCheck size={12} weight="fill" /> : <SealWarning size={12} weight="fill" />}
      {hit ? "Hit" : "Miss"}
    </span>
  );
}
