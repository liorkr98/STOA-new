import Link from "next/link";
import { cn } from "@/lib/design/cn";

/**
 * Stock ticker (and its no-ticker cousin, the theme tag) as an outlined pill:
 * hairline border, Plex Mono, uppercase, letterspaced, ink. Built as a neutral
 * sibling of DirectionTag (LONG/SHORT) so a ticker and a direction read as one
 * row of chips. Use TickerChip for symbols ("NVDA") and ThemeTag for
 * publications with no single ticker ("MACRO / OIL & ENERGY", "SEMIS").
 */
const chipBase =
  "inline-flex items-center rounded-[var(--radius-tag)] border border-border bg-surface-2 px-2 py-0.5 num text-[0.6875rem] font-semibold uppercase tracking-wider text-text";
const chipLink = "transition-colors hover:border-border-strong hover:text-text focus-ring";

function Pill({ label, href, className }: { label: string; href?: string; className?: string }) {
  if (href) {
    return (
      <Link href={href} title={label} className={cn(chipBase, chipLink, className)}>
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

export function TickerChip({
  ticker,
  href,
  className,
}: {
  ticker: string;
  href?: string;
  className?: string;
}) {
  return <Pill label={ticker} href={href} className={className} />;
}

export function ThemeTag({
  label,
  href,
  className,
}: {
  label: string;
  href?: string;
  className?: string;
}) {
  return <Pill label={label} href={href} className={className} />;
}
