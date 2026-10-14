import Link from "next/link";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Chips: small pills that label a publication. Three kinds, and only these:
 *
 *   TickerChip  the symbol, in JetBrains Mono (the one place mono appears)
 *   StanceChip  long / short / hold (stance-chip.tsx). In the gain or loss
 *               TEXT tone; hold is quiet. While the Interest Cart is on it is
 *               plain ink, so the cart's animals are the only coloured
 *               animals on screen (DESIGN_LANGUAGE 1.3).
 *   Chip        the quiet neutral one: themes, tags, counts, states
 *
 * No uppercase, no letterspacing. Words are sentence case.
 */

const chipBase =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-chip border bg-surface px-2.5 py-0.5 text-ticker font-semibold leading-snug";
const linkable = "transition-colors hover:border-border-strong focus-ring";

/** Quiet neutral chip. */
export function Chip({ className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn(chipBase, "border-border text-text-mute", className)} {...props} />;
}

function Pill({
  label,
  href,
  className,
}: {
  label: string;
  href?: string;
  className: string;
}) {
  if (href) {
    return (
      <Link href={href} title={label} className={cn(chipBase, linkable, className)}>
        {label}
      </Link>
    );
  }
  return (
    <span title={label} className={cn(chipBase, className)}>
      {label}
    </span>
  );
}

/** A stock symbol ("NVDA"). */
export function TickerChip({
  ticker,
  href,
  className,
}: {
  ticker: string;
  href?: string;
  className?: string;
}) {
  return (
    <Pill
      label={ticker}
      href={href}
      className={cn("border-border-strong font-mono text-text tracking-[-0.01em]", className)}
    />
  );
}

/** A publication with no single ticker ("Macro", "Semis"). */
export function ThemeChip({
  label,
  href,
  className,
}: {
  label: string;
  href?: string;
  className?: string;
}) {
  return <Pill label={label} href={href} className={cn("border-border text-text-mute", className)} />;
}

export { StanceChip } from "@/components/ui/stance-chip";
