import Link from "next/link";
import { cn } from "@/lib/design/cn";

type Size = "sm" | "md" | "lg";

/** score is the engine's 0-100 composite (see src/lib/engine/score.ts). */
function scoreColor(score: number) {
  if (score >= 70) return "var(--verdigris)";
  if (score >= 40) return "var(--brass)";
  return "var(--rust)";
}

function Wrapper({
  linked,
  href,
  className,
  title,
  children,
}: {
  linked: boolean;
  href: string;
  className: string;
  title?: string;
  children: React.ReactNode;
}) {
  if (!linked) {
    return (
      <span className={className} title={title}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={className} title={title}>
      {children}
    </Link>
  );
}

/**
 * Track Score badge — public analyst track-record grade (0–100).
 * Links to `/analyst/{handle}/score` unless `linked={false}`.
 */
export function TrackScoreBadge({
  handle,
  score,
  hitRate,
  sampleSize,
  size = "md",
  linked = true,
  className,
}: {
  handle: string;
  score: number | null;
  hitRate?: number | null;
  sampleSize?: number;
  size?: Size;
  linked?: boolean;
  className?: string;
}) {
  const empty = score == null;
  const color = empty ? "var(--text-faint)" : scoreColor(score);
  const provisional = sampleSize != null && sampleSize < 10;
  const href = `/analyst/${handle}/score`;

  if (size === "sm") {
    return (
      <Wrapper
        linked={linked}
        href={href}
        className={cn(
          "inline-flex items-center gap-1 rounded-[var(--r-tag)] px-1 -mx-1 transition-colors hover:bg-surface-2 focus-ring",
          className,
        )}
        title={empty ? "Not yet scored" : `Track Score ${score}`}
      >
        <SealDot color={color} />
        <span className="num text-xs font-semibold" style={{ color }}>
          {empty ? "—" : score}
        </span>
      </Wrapper>
    );
  }

  if (size === "md") {
    return (
      <Wrapper
        linked={linked}
        href={href}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-[var(--r-tag)] px-1 -mx-1 transition-colors hover:bg-surface-2 focus-ring",
          className,
        )}
      >
        <SealDot color={color} />
        <span className="num text-sm font-semibold" style={{ color }}>
          {empty ? "—" : score}
        </span>
        {!empty && hitRate != null && (
          <span className="t-meta">&middot; {Math.round(hitRate * 100)}% hit rate</span>
        )}
      </Wrapper>
    );
  }

  return (
    <Wrapper
      linked={linked}
      href={href}
      className={cn(
        "ledger-card flex items-center gap-4 p-4 transition-transform active:scale-[0.99] focus-ring",
        className,
      )}
    >
      <SealDot color={color} size={40} />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-2">
          <span className="num text-3xl font-semibold leading-none" style={{ color }}>
            {empty ? "—" : score}
          </span>
          <span className="t-eyebrow">Track Score</span>
        </div>
        {empty ? (
          <span className="t-meta">Not yet scored</span>
        ) : (
          <span className="t-meta">
            {hitRate != null && `${Math.round(hitRate * 100)}% hit rate`}
            {sampleSize != null && ` over ${sampleSize} resolved call${sampleSize === 1 ? "" : "s"}`}
          </span>
        )}
        {provisional && <span className="t-meta text-[var(--brass)]">Provisional — small sample</span>}
        <span className="t-meta underline">View full breakdown</span>
      </div>
    </Wrapper>
  );
}

/** @deprecated Use TrackScoreBadge */
export const MoatBadge = TrackScoreBadge;

function SealDot({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, border: `2px solid ${color}` }}
    />
  );
}
