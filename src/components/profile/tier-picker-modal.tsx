"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { usd } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { useSubscribeToPlan } from "@/hooks/use-spend";
import { ConfirmSpendDialog } from "@/components/wallet/confirm-spend-dialog";
import type { Plan } from "@/lib/db/plans";

/**
 * Tier picker. Centred modal on desktop, bottom sheet on mobile (single
 * responsive component). Uses real plan data and the existing subscribe hook +
 * ConfirmSpendDialog, so paid tiers still move through the 90/10 confirm flow.
 * The "MOST POPULAR" flag is a placeholder (marks the middle tier) until the
 * backend carries it -- see the profile page's data-gap notes.
 */
export function TierPickerModal({
  plans,
  handle,
  firstName,
  balance,
  isAuthed,
  onClose,
}: {
  plans: Plan[];
  handle: string;
  firstName: string;
  balance: number;
  isAuthed: boolean;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState<Plan | null>(null);
  const mutation = useSubscribeToPlan(handle);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Placeholder popular marker: the middle tier by rank.
  const popularIdx = plans.length >= 3 ? Math.floor(plans.length / 2) : -1;
  const price = (p: Plan) => p.price_cents / 100;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-[color-mix(in_srgb,var(--ink)_45%,transparent)] md:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Subscribe to ${firstName}`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative max-h-[88dvh] w-full overflow-y-auto rounded-t-[18px] border border-border bg-bg p-4 md:max-h-[90dvh] md:w-[900px] md:rounded-[16px] md:p-10"
      >
        <div className="flex justify-center pb-3 md:hidden">
          <div className="h-1 w-11 rounded-full bg-border-strong" />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="focus-ring absolute right-5 top-5 hidden h-8 w-8 items-center justify-center rounded-full border border-border bg-surface hover:border-border-strong md:flex"
        >
          <X size={12} strokeWidth={1.6} />
        </button>

        <h2 className="t-h2 font-display">Subscribe to {firstName}</h2>
        <p className="t-body mt-2">Locked at publication, graded by the market. Cancel anytime.</p>

        {!isAuthed ? (
          <Link href="/sign-in" className={buttonClass("primary", "lg", "mt-6 w-full")}>
            Sign in to subscribe
          </Link>
        ) : plans.length === 0 ? (
          <p className="t-meta mt-6">This analyst has not set up subscription tiers yet.</p>
        ) : (
          <div className="mt-6 flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">
            {plans.map((plan, i) => {
              const free = plan.price_cents <= 0;
              const popular = i === popularIdx;
              return (
                <div
                  key={plan.id}
                  className={cn(
                    "relative flex flex-col rounded-[var(--radius-card)] bg-surface p-5",
                    popular ? "border-2 border-[var(--ink)]" : "border border-border",
                  )}
                >
                  {popular && (
                    <span className="num absolute -top-2.5 left-5 rounded-full bg-[var(--ink)] px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-[var(--paper)]">
                      Most popular
                    </span>
                  )}
                  <span className="num text-[10.5px] uppercase tracking-[0.18em] text-text-mute">
                    {plan.name}
                  </span>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">
                      {free ? "Free" : usd(price(plan))}
                    </span>
                    {!free && (
                      <span className="num text-[11px] text-text-mute">
                        /{plan.interval === "year" ? "yr" : "mo"}
                      </span>
                    )}
                  </div>
                  {plan.description && (
                    <p className="t-body mt-2.5 min-h-[42px] text-sm">{plan.description}</p>
                  )}
                  <ul className="mt-4 flex flex-1 flex-col gap-2.5">
                    {plan.perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2.5 text-sm">
                        <Check size={12} strokeWidth={1.6} className="shrink-0 text-[var(--verdigris)]" aria-hidden />
                        {perk}
                      </li>
                    ))}
                  </ul>
                  {!free && (plan.trial_days ?? 0) > 0 && (
                    <p className="num mt-4 text-[9.5px] uppercase tracking-[0.14em] text-[var(--verdigris)]">
                      {plan.trial_days}-day free trial
                    </p>
                  )}
                  <button
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => (free ? mutation.mutate(plan.id) : setConfirming(plan))}
                    className={cn(
                      "mt-4 w-full rounded-[var(--radius-btn)] px-3 py-3 text-sm font-medium transition-opacity hover:opacity-90 focus-ring",
                      popular
                        ? "bg-[var(--ink)] text-[var(--paper)]"
                        : "border border-border bg-transparent text-text",
                    )}
                  >
                    {free ? "Join free" : (plan.trial_days ?? 0) > 0 ? "Start free trial" : "Subscribe"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {mutation.data?.error && (
          <p className="mt-3 text-center text-[12px] text-[var(--down)]">{mutation.data.error}</p>
        )}
        <p className="num mt-6 text-center text-[10px] uppercase tracking-[0.14em] text-text-faint">
          Existing subscribers keep their locked-in price.
        </p>

        {confirming && (
          <ConfirmSpendDialog
            open={!!confirming}
            onClose={() => {
              setConfirming(null);
              mutation.reset();
            }}
            title={`${confirming.name} - @${handle}`}
            amount={price(confirming)}
            balance={balance}
            confirmLabel="Confirm subscription"
            pending={mutation.isPending}
            result={mutation.data}
            onConfirm={() => mutation.mutate(confirming.id)}
          />
        )}
      </div>
    </div>
  );
}
