import { cn } from "@/lib/design/cn";

/**
 * The 0-100 analyst score dial. The ring fills with the accent color; the score
 * itself is never colored by sentiment (it is a skill metric, not a P/L number).
 */
export function ScoreRing({
  score,
  size = 96,
  stroke = 8,
  label = "Score",
  className,
}: {
  score: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const offset = c * (1 - pct);

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
        <span className="num font-semibold leading-none" style={{ fontSize: size * 0.3 }}>
          {Math.round(score)}
        </span>
        <span className="t-eyebrow mt-1" style={{ fontSize: size * 0.085 }}>
          {label}
        </span>
      </span>
    </div>
  );
}
