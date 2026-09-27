"use client";

import Link from "next/link";
import { useState } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { usd } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { useSubscribeToPlan } from "@/hooks/use-spend";
import { ConfirmSpendDialog } from "./confirm-spend-dialog";
import type { Plan } from "@/lib/db/plans";
import { Card } from "@/components/ui/card";

/**
 * PlanPicker (Part C checkout): the storefront subscribe surface when a creator
 * has tiers. Free tier joins directly (no money moves); paid tiers confirm
 * through ConfirmSpendDialog (cost, balance, new balance, 90/10 split) and call
 * the subscribe_to_plan RPC. Legacy single-price SubscribeButton remains the
 * fallback for creators without plans.
 */
export function PlanPicker({
  plans,
  handle,
  balance,
  isAuthed,
  subscribed,
}: {
  plans: Plan[];
  handle: string;
  balance: number;
  isAuthed: boolean;
  subscribed: boolean;
}) {
  const [confirming, setConfirming] = useState<Plan | null>(null);
  const mutation = useSubscribeToPlan(handle);

  if (!isAuthed) {
    return (
      <Link href="/sign-in" className={buttonClass("ghost", "lg", "w-full")}>
        Sign in to subscribe
      </Link>
    );
  }

  const price = (p: Plan) => p.price_cents / 100;

  return (
    <div className="flex w-full flex-col gap-2">
      {subscribed && (
        <p className="t-meta text-center text-ticker">You are subscribed - switch tier anytime</p>
      )}
      {plans.map((plan) => {
        const free = plan.price_cents <= 0;
        return (
          <Card
            key={plan.id}
            className="p-3"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-body font-semibold">{plan.name}</span>
              <span className="num text-body">
                {free ? "Free" : `${usd(price(plan))}/${plan.interval === "year" ? "yr" : "mo"}`}
              </span>
            </div>
            {plan.description && <p className="t-meta mt-0.5 text-ticker">{plan.description}</p>}
            {plan.perks.length > 0 && (
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {plan.perks.slice(0, 4).map((perk) => (
                  <li key={perk} className="flex items-center gap-1.5 text-ticker text-text-mute">
                    <Check size={11} className="shrink-0 text-text-mute" aria-hidden />
                    {perk}
                  </li>
                ))}
              </ul>
            )}
            {!free && (plan.trial_days ?? 0) > 0 && (
              <p className="t-meta mt-1 text-ticker">{plan.trial_days}-day free trial</p>
            )}
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => (free ? mutation.mutate(plan.id) : setConfirming(plan))}
              className={cn(
                buttonClass("ghost", "sm", "mt-2 w-full"),
              )}
            >
              {free ? "Join free" : `Subscribe - ${usd(price(plan))}`}
            </button>
          </Card>
        );
      })}
      {mutation.data?.error && (
        <p className="text-center text-ticker text-[var(--error)]">{mutation.data.error}</p>
      )}

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
  );
}
