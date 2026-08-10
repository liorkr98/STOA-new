import { ArrowUpRight, Target, Clock } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { TickerChip } from "@/components/ui/ticker-chip";
import { price, pct } from "@/lib/format";
import type { Prediction } from "@/lib/types";
import { DirectionTag, GradeTag, PendingReviewTag } from "./ui/tag";
import { SealStamp } from "./ui/seal-stamp";

/**
 * The investment card. The signature object of Stoa: ticker, direction, entry,
 * target, horizon, and a live/graded outcome. Sentiment color is allowed here
 * on the direction tag, grade tag, and the return number only.
 *
 * hideTarget: for paywalled teasers, keep ticker/direction/seal visible but
 * do not leak the price target before unlock.
 */
export function PredictionCard({
  prediction,
  className,
  hideTarget = false,
  pendingReview = false,
}: {
  prediction: Prediction;
  className?: string;
  hideTarget?: boolean;
  /** True when the report itself is resolution_pending_review: the horizon
   * passed but the market-data provider had no price to grade against.
   * Overrides the outcome-derived tag/seal -- the call isn't "open" (its
   * horizon has passed), it's waiting on data, and it isn't graded either. */
  pendingReview?: boolean;
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
    created_at,
  } = prediction;
  const resolved = outcome !== "open" && !pendingReview;
  const tone = return_pct == null ? "neutral" : return_pct >= 0 ? "up" : "down";
  const alpha =
    return_pct != null && benchmark_pct != null ? return_pct - benchmark_pct : null;
  const sealStatus =
    !pendingReview && (outcome === "hit" || outcome === "near")
      ? "hit"
      : !pendingReview && outcome === "miss"
        ? "miss"
        : "locked";
  const showTarget = !hideTarget;
  const cols = showTarget ? "grid-cols-3" : "grid-cols-2";

  return (
    <div className={cn("ledger-card p-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <TickerChip ticker={ticker} />
          <DirectionTag direction={direction} />
        </div>
        <div className="flex items-center gap-2">
          {pendingReview ? (
            <PendingReviewTag />
          ) : resolved ? (
            <GradeTag outcome={outcome} />
          ) : (
            <GradeTag outcome="open" />
          )}
          {!showTarget && (
            <SealStamp status={sealStatus} date={new Date(created_at)} size="sm" animateOnView={resolved} />
          )}
        </div>
      </div>

      <div className={cn("mt-4 grid gap-3", cols)}>
        <Field label="Entry" value={`$${price(lock_price)}`} />
        {showTarget && (
          <Field
            label="Target"
            value={target_price ? `$${price(target_price)}` : "Open"}
            icon={<Target size={12} strokeWidth={2.5} />}
            trailing={<SealStamp status={sealStatus} date={new Date(created_at)} size="sm" animateOnView={resolved} />}
          />
        )}
        <Field
          label={pendingReview ? "Status" : resolved ? "Resolved" : "Now"}
          value={resolved_price ? `$${price(resolved_price)}` : pendingReview ? "Under review" : "Pending"}
        />
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
        <span className="t-meta inline-flex items-center gap-1">
          <Clock size={13} strokeWidth={2.5} />
          {prediction.horizon_days}d horizon
        </span>
        {!hideTarget && (
          <span
            className={cn(
              "num text-sm font-semibold inline-flex items-center gap-0.5",
              tone === "up" && "text-[var(--up)]",
              tone === "down" && "text-[var(--down)]",
              tone === "neutral" && "text-text-mute",
            )}
          >
            {return_pct != null && <ArrowUpRight size={14} strokeWidth={2.5} />}
            {pct(return_pct)}
          </span>
        )}
      </div>

      {resolved && alpha != null && !hideTarget && (
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
  trailing,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-eyebrow inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="num text-sm font-medium">{value}</span>
        {trailing}
      </span>
    </div>
  );
}
