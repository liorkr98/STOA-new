import { ArrowUpRight, Target, Clock } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/design/cn";
import { price, pct } from "@/lib/format";
import type { Prediction } from "@/lib/types";
import { DirectionTag, GradeTag } from "./ui/tag";

/**
 * The investment card. The signature object of Stoa: ticker, direction, entry,
 * target, horizon, and a live/graded outcome. Sentiment color is allowed here
 * on the direction tag, grade tag, and the return number only.
 */
export function PredictionCard({
  prediction,
  className,
}: {
  prediction: Prediction;
  className?: string;
}) {
  const {
    ticker,
    direction,
    lock_price,
    target_price,
    resolved_price,
    outcome,
    return_pct,
    benchmark_pct,
  } = prediction;
  const resolved = outcome !== "open";
  const tone = return_pct == null ? "neutral" : return_pct >= 0 ? "up" : "down";
  const alpha =
    return_pct != null && benchmark_pct != null ? return_pct - benchmark_pct : null;

  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] border border-border bg-surface-2/60 p-4",
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="num text-lg font-semibold tracking-tight">{ticker}</span>
          <DirectionTag direction={direction} />
        </div>
        {resolved ? <GradeTag outcome={outcome} /> : <GradeTag outcome="open" />}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Field label="Entry" value={`$${price(lock_price)}`} />
        <Field
          label="Target"
          value={target_price ? `$${price(target_price)}` : "Open"}
          icon={<Target size={12} weight="bold" />}
        />
        <Field
          label={resolved ? "Resolved" : "Now"}
          value={resolved_price ? `$${price(resolved_price)}` : "Pending"}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="t-meta inline-flex items-center gap-1">
          <Clock size={13} weight="bold" />
          {prediction.horizon_days}d horizon
        </span>
        <span
          className={cn(
            "num text-sm font-semibold inline-flex items-center gap-0.5",
            tone === "up" && "text-[var(--up)]",
            tone === "down" && "text-[var(--down)]",
            tone === "neutral" && "text-text-mute",
          )}
        >
          {return_pct != null && <ArrowUpRight size={14} weight="bold" />}
          {pct(return_pct)}
        </span>
      </div>

      {resolved && alpha != null && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="t-meta">vs S&P {pct(benchmark_pct)}</span>
          <span
            className="num font-medium"
            style={{ color: alpha >= 0 ? "var(--up)" : "var(--down)" }}
          >
            {pct(alpha)} alpha
          </span>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-eyebrow inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="num text-sm font-medium">{value}</span>
    </div>
  );
}
