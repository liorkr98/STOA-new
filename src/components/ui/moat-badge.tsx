import Link from "next/link";
import { cn } from "@/lib/design/cn";

type Size = "sm" | "md" | "lg";

/** score is the engine's 0-100 composite (see src/lib/engine/score.ts). */
function scoreColor(score: number) {
  if (score >= 70) return "var(--verdigris)";
  if (score >= 40) return "var(--brass)";
  return "var(--rust)";
}

/**
 * Appears everywhere a creator's name does. Always links to that creator's
 * MOAT Analytics. sampleSize gates the "provisional" note -- the engine's
 * own sample-ramp confidence weighting already discounts small samples in
 * `score` itself; this just surfaces that honestly rather than presenting a
 * six-call score with the same confidence as a sixty-call one.
 */
export function MoatBadge({
  handle,
  score,
  hitRate,
  sampleSize,
  size = "md",
  className,
}: {
  handle: string;
  score: number | null;
  hitRate?: number | null;
  sampleSize?: number;
  size?: Size;
  className?: string;
}) {
  const empty = score == null;
  const color = empty ? "var(--text-faint)" : scoreColor(score);
  const provisional = sampleSize != null && sampleSize < 10;

  if (size === "sm") {
    return (
      <Link
        href={`/@${handle}/moat`}
        className={cn(
          "inline-flex items-center gap-1 rounded-[var(--r-tag)] px-1 -mx-1 transition-colors hover:bg-surface-2 focus-ring",
          className,
        )}
        title={empty ? "Not yet scored" : `MOAT ${score}`}
      >
        <SealDot color={color} />
        <span className="num text-xs font-semibold" style={{ color }}>
          {empty ? "—" : score}
        </span>
      </Link>
    );
  }

  if (size === "md") {
    return (
      <Link
        href={`/@${handle}/moat`}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--r-tag)] px-1 -mx-1 transition-colors hover:bg-surface-2 focus-ring",
          className,
        )}
      >
        <SealDot color={color} />
        <span className="num text-sm font-semibold" style={{ color }}>
          {empty ? "— MOAT" : score}
        </span>
        {!empty && hitRate != null && (
          <span className="t-meta">&middot; {Math.round(hitRate * 100)}% hit rate</span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/@${handle}/moat`}
      className={cn("ledger-card flex items-center gap-4 p-4 transition-transform active:scale-[0.99] focus-ring", className)}
    >
      <SealDot color={color} size={40} />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="num text-3xl font-semibold leading-none" style={{ color }}>
            {empty ? "—" : score}
          </span>
          <span className="t-eyebrow">MOAT</span>
        </div>
        {empty ? (
          <span className="t-meta">Not yet scored</span>
        ) : (
          <span className="t-meta">
            {hitRate != null && `${Math.round(hitRate * 100)}% hit rate`}
            {sampleSize != null && ` over ${sampleSize} resolved call${sampleSize === 1 ? "" : "s"}`}
          </span>
        )}
        {provisional && <span className="t-meta text-[var(--brass)]">Provisional -- small sample</span>}
        <span className="t-meta underline">View full breakdown</span>
      </div>
    </Link>
  );
}

function SealDot({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, border: `2px solid ${color}` }}
    />
  );
}
