import { cn } from "@/lib/design/cn";
import { ratingToPercent } from "@/lib/engine/score";

/**
 * Analyst skill dial. Default mode shows the public 600-1400 rating; pass
 * mode="score" for the internal 0-100 composite used for tiers.
 */
export function ScoreRing({
  score,
  rating,
  mode = "rating",
  size = 96,
  stroke = 8,
  className,
}: {
  score?: number;
  rating?: number;
  mode?: "score" | "rating";
  size?: number;
  stroke?: number;
  className?: string;
}) {
  const isRating = mode === "rating";
  const display = isRating ? (rating ?? 600) : (score ?? 0);
  const pct = isRating ? ratingToPercent(display) : Math.max(0, Math.min(100, display));
  const label = isRating ? "Rating" : "Score";

  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = pct / 100;
  const offset = c * (1 - fill);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="absolute flex flex-col items-center">
        <span className="num font-semibold leading-none" style={{ fontSize: size * (isRating ? 0.22 : 0.3) }}>
          {Math.round(display)}
        </span>
        <span className="t-eyebrow mt-1" style={{ fontSize: size * 0.085 }}>
          {label}
        </span>
      </span>
    </div>
  );
}
