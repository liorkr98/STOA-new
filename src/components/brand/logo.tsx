import { cn } from "@/lib/design/cn";

/**
 * Stoa mark: three columns of a colonnade that double as candlestick bars.
 * A single simple geometric mark, drawn from primitives.
 */
export function StoaMark({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect x="3" y="7" width="3" height="11" rx="1.2" fill="var(--accent)" />
      <rect x="10.5" y="4" width="3" height="16" rx="1.2" fill="currentColor" />
      <rect x="18" y="9" width="3" height="8" rx="1.2" fill="var(--accent)" />
      <line x1="4.5" y1="3.5" x2="4.5" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1="12" y1="1.5" x2="12" y2="4" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <line x1="19.5" y1="5.5" x2="19.5" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.35" />
    </svg>
  );
}

export function StoaLogo({
  className,
  withMark = true,
}: {
  className?: string;
  withMark?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-text", className)}>
      {withMark && <StoaMark />}
      <span
        className="font-semibold"
        style={{
          fontFamily: "var(--font-display)",
          letterSpacing: "0.26em",
          fontSize: "1.05rem",
        }}
      >
        STOA
      </span>
    </span>
  );
}
