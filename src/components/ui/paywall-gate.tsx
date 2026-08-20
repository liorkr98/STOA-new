import { cn } from "@/lib/design/cn";
import type { ReactNode } from "react";

/**
 * Wraps the report body only -- never the ticker strip, call block, or
 * disclosure block, which render outside this component entirely. onUnlock/onSubscribe should both be secondary (outlined)
 * variants, not one primary + one secondary -- unlocking per-report and
 * subscribing are genuinely alternative paths, not a hierarchy.
 *
 * previewText is optional -- report_bodies is RLS-gated so a non-entitled
 * reader currently gets no body text at all (see BACKEND_DATA_CONTRACTS.md).
 * Prefer a short body tease, not a duplicate of the summary already shown
 * above the gate. Never render this while entitlement is still resolving.
 */
export function PaywallGate({
  previewText,
  headline = "Unlock the full report",
  body = "The locked call and the disclosures stay visible. The research body unlocks with purchase or subscription.",
  onUnlock,
  onSubscribe,
  isAuthed,
  loginHref,
}: {
  previewText?: string;
  headline?: string;
  body?: string;
  /** Pass the real BuyReportButton (with its own spend/entitlement logic). */
  onUnlock: ReactNode;
  /** Pass the real SubscribeButton (with its own spend/entitlement logic). */
  onSubscribe: ReactNode;
  isAuthed: boolean;
  loginHref: string;
}) {
  return (
    <div className="relative mt-6">
      {previewText && (
        <div className="relative max-h-40 overflow-hidden">
          <p className="t-body-editorial">{previewText}</p>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20"
            style={{ background: "linear-gradient(to bottom, transparent, var(--paper))" }}
          />
        </div>
      )}

      <div className={cn("ledger-card p-6 text-center", previewText && "-mt-2")}>
        <h2 className="t-h3">{headline}</h2>
        <p className="t-body mx-auto mt-2 max-w-md text-sm">{body}</p>
        <ul className="t-meta mx-auto mt-4 max-w-sm space-y-1.5 text-left">
          <li>Fact-checked claims stay on the record</li>
          <li>Platform fee is shown as its own line at checkout (10%)</li>
          <li>Call block and disclosures remain free to read</li>
        </ul>
        <div className={cn("mt-5 flex flex-col gap-3", onUnlock && onSubscribe && "sm:flex-row")}>
          {onUnlock && <div className="mx-auto w-full max-w-xs flex-1 sm:mx-0">{onUnlock}</div>}
          {onSubscribe && (
            <div className="mx-auto w-full max-w-xs flex-1 sm:mx-0">{onSubscribe}</div>
          )}
        </div>
        {!isAuthed && (
          <p className="t-meta mt-3">
            Already subscribed?{" "}
            <a href={loginHref} className="underline hover:no-underline focus-ring rounded-[var(--r-tag)]">
              Log in
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
