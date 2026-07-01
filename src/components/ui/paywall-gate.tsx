import { cn } from "@/lib/design/cn";

/**
 * Wraps the report body only -- never the ticker strip, call block,
 * disclosure block, or MoatBadge, which render outside this component
 * entirely. onUnlock/onSubscribe should both be secondary (outlined)
 * variants, not one primary + one secondary -- unlocking per-report and
 * subscribing are genuinely alternative paths, not a hierarchy.
 *
 * previewText is optional -- report_bodies is RLS-gated so a non-entitled
 * reader currently gets no body text at all (see BACKEND_DATA_CONTRACTS.md).
 * Without it this renders the CTA card alone rather than a scrim over
 * nothing. Never render this while entitlement is still resolving -- decide
 * canRead server-side before choosing between this and the real body.
 */
export function PaywallGate({
  previewText,
  onUnlock,
  onSubscribe,
  isAuthed,
  loginHref,
}: {
  previewText?: string;
  /** Pass the real BuyReportButton (with its own spend/entitlement logic). */
  onUnlock: React.ReactNode;
  /** Pass the real SubscribeButton (with its own spend/entitlement logic). */
  onSubscribe: React.ReactNode;
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
        <div className={cn("flex flex-col gap-3", onUnlock && onSubscribe && "sm:flex-row")}>
          {onUnlock && <div className="flex-1 max-w-xs mx-auto sm:mx-0 w-full">{onUnlock}</div>}
          {onSubscribe && <div className="flex-1 max-w-xs mx-auto sm:mx-0 w-full">{onSubscribe}</div>}
        </div>
        {!isAuthed && (
          <p className="t-meta mt-3">
            Already subscribed?{" "}
            <a href={loginHref} className="underline hover:no-underline">
              Log in
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
