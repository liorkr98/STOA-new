import { cn } from "@/lib/design/cn";

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
  className,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "neutral" | "up" | "down";
  className?: string;
}) {
  const color =
    tone === "up" ? "text-[var(--up)]" : tone === "down" ? "text-[var(--down)]" : "text-text";
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="t-eyebrow">{label}</span>
      <span className={cn("num text-2xl font-semibold leading-none", color)}>{value}</span>
      {sub ? <span className="t-meta">{sub}</span> : null}
    </div>
  );
}
