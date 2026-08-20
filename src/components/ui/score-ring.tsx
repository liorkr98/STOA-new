import { cn } from "@/lib/design/cn";

type Size = "sm" | "md" | "lg";

const DIM: Record<Size, number> = { sm: 28, md: 56, lg: 90 };
const BORDER: Record<Size, number> = { sm: 1, md: 1.5, lg: 1.5 };
const NUM_CLASS: Record<Size, string> = {
  sm: "text-[0.8125rem]",
  md: "text-[1.375rem]",
  lg: "text-[2.125rem]",
};
const LABEL_CLASS: Record<Size, string> = {
  sm: "text-[0.5rem]",
  md: "text-[0.5625rem]",
  lg: "text-[0.625rem]",
};

/**
 * Track Score rendered as an upright hairline ring with the number centred in
 * ink. The ring is a FRAME, not a meter -- deliberately never an arc-fill or
 * progress gauge, and never angled or coloured. That keeps it visually distinct
 * from the angled, coloured HIT/MISS SealStamp, which stays the product's only
 * angled circle. When the sample is small the score shows a mono "PROVISIONAL"
 * label beneath (brass, the certification/unproven token).
 */
export function ScoreRing({
  score,
  size = "sm",
  provisional = false,
  className,
}: {
  score: number | null;
  size?: Size;
  provisional?: boolean;
  className?: string;
}) {
  const dim = DIM[size];
  const empty = score == null;

  return (
    <span className={cn("inline-flex flex-col items-center gap-0.5 align-middle", className)}>
      <span
        role="img"
        aria-label={empty ? "Not yet scored" : `Track Score ${score}`}
        title={empty ? "Not yet scored" : `Track Score ${score}`}
        className="inline-flex items-center justify-center rounded-full"
        style={{
          width: dim,
          height: dim,
          border: `${BORDER[size]}px solid var(--border)`,
        }}
      >
        <span
          className={cn("num font-semibold leading-none tabular-nums", NUM_CLASS[size])}
          style={{ color: empty ? "var(--text-faint)" : "var(--ink)" }}
        >
          {empty ? "-" : score}
        </span>
      </span>
      {provisional && (
        <span
          className={cn("num uppercase leading-none tracking-[0.14em]", LABEL_CLASS[size])}
          style={{ color: "var(--brass)" }}
        >
          Provisional
        </span>
      )}
    </span>
  );
}
