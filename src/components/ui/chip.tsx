import Link from "next/link";
import type { HTMLAttributes } from "react";
import { cn } from "@/lib/design/cn";
import type { Direction } from "@/lib/types";

/**
 * Chips: small pills that label a publication. Three kinds, and only these:
 *
 *   TickerChip  the symbol, in JetBrains Mono (the one place mono appears)
 *   StanceChip  long / short / hold, plain ink with a ▲ / ▼; hold is quiet.
 *               Never green or red: wherever a stance shows, the Interest
 *               Cart's bull and bear sit beside the ticker, and they are the
 *               only coloured animals on the screen (DESIGN_LANGUAGE 1.3).
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

const stanceLabel: Record<Direction, string> = { long: "Long", short: "Short", hold: "Hold" };

const stanceStyle: Record<Direction, string> = {
  long: "border-border-strong text-text",
  short: "border-border-strong text-text",
  hold: "border-border text-text-mute",
};

const stanceGlyph: Record<Direction, string> = { long: "▲", short: "▼", hold: "" };

/** The declared stance on a publication. */
export function StanceChip({ direction, className }: { direction: Direction; className?: string }) {
  return (
    <span className={cn(chipBase, "border-[1.5px]", stanceStyle[direction], className)}>
      {stanceGlyph[direction] ? (
        <span aria-hidden className="text-[0.7em] leading-none">
          {stanceGlyph[direction]}
        </span>
      ) : null}
      {stanceLabel[direction]}
    </span>
  );
}
