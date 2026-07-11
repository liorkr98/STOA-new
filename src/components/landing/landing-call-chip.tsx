import { cn } from "@/lib/design/cn";
import { price, pct } from "@/lib/format";
import type { ResolvedCall } from "@/lib/db/predictions";
import { DirectionTag, GradeTag } from "@/components/ui/tag";
import { SealStamp } from "@/components/ui/seal-stamp";

/**
 * A resolved call reduced to its ledger essentials: ticker, direction, the
 * two prices that matter, the graded outcome, and who made it. Real rows
 * only -- the landing shows the actual ledger, never invented numbers.
 */
export function LandingCallChip({
  call,
  size = "md",
  withSeal = false,
  className,
}: {
  call: ResolvedCall;
  size?: "md" | "lg";
  withSeal?: boolean;
  className?: string;
}) {
  const up = (call.return_pct ?? 0) >= 0;
  const sealStatus =
    call.outcome === "hit" || call.outcome === "near" ? "hit" : call.outcome === "miss" ? "miss" : "hit";

  return (
    <div
      className={cn(
        "ledger-card bg-surface",
        size === "lg" ? "p-4" : "p-3",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("num font-semibold tracking-tight", size === "lg" ? "text-lg" : "text-base")}>
          {call.ticker}
        </span>
        <span className="flex items-center gap-1.5">
          <DirectionTag direction={call.direction} />
          <GradeTag outcome={call.outcome} />
        </span>
      </div>

      <div className={cn("mt-2.5 flex items-end justify-between gap-3", size === "lg" && "mt-3")}>
        <div className="flex flex-col gap-0.5">
          <span className="num text-xs text-text-mute">
            ${price(call.lock_price)}
            <span className="mx-1 text-text-faint" aria-hidden>&rarr;</span>
            {call.resolved_price != null ? `$${price(call.resolved_price)}` : "?"}
          </span>
          <span
            className={cn("num font-semibold", size === "lg" ? "text-xl" : "text-sm")}
            style={{ color: up ? "var(--up)" : "var(--down)" }}
          >
            {pct(call.return_pct)}
          </span>
        </div>
        {withSeal && (
          <SealStamp
            status={sealStatus}
            date={new Date(call.resolves_at)}
            size="sm"
            animateOnView
          />
        )}
      </div>

      {call.author && (
        <p className="t-meta mt-2 flex items-baseline justify-between gap-2 border-t border-border pt-2">
          <span className="truncate">@{call.author.handle}</span>
          {call.benchmark_pct != null && call.return_pct != null && (
            <span className="num shrink-0">{pct(call.return_pct - call.benchmark_pct)} alpha</span>
          )}
        </p>
      )}
    </div>
  );
}
