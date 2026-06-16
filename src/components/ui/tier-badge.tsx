import { cn } from "@/lib/design/cn";

const tierTone: Record<string, string> = {
  legend: "text-accent border-accent/40 bg-accent-weak",
  elite: "text-accent border-accent/30 bg-accent-weak",
  expert: "text-text border-border bg-surface-2",
  strong: "text-text border-border bg-surface-2",
  rising: "text-text-mute border-border bg-surface-2",
  building: "text-text-faint border-border bg-surface-2",
};

export function TierBadge({
  tier,
  label,
  className,
}: {
  tier: string;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide",
        tierTone[tier] ?? tierTone.building,
        className,
      )}
    >
      {label ?? tier}
    </span>
  );
}
