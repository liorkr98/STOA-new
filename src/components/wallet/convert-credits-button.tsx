"use client";

import { useTransition } from "react";
import { Coins } from "@phosphor-icons/react";
import { convertToCredits } from "@/app/actions/wallet";
import { AI_CREDITS_PER_DOLLAR } from "@/lib/ai/credits";
import { buttonClass } from "@/components/ui/button";

export function ConvertCreditsButton({ balance }: { balance: number }) {
  const [pending, start] = useTransition();
  const amounts = [5, 10, 25].filter((a) => a <= balance);

  if (amounts.length === 0) return null;

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Coins size={18} className="text-accent" />
        <p className="text-sm font-semibold">Buy AI credits</p>
      </div>
      <p className="t-meta mt-1">
        $1 = {AI_CREDITS_PER_DOLLAR} credits · used for chat, outlines, fact-checks
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {amounts.map((usd) => (
          <button
            key={usd}
            type="button"
            disabled={pending}
            className={buttonClass("secondary", "sm")}
            onClick={() => start(async () => { await convertToCredits(usd); })}
          >
            ${usd} → {usd * AI_CREDITS_PER_DOLLAR} credits
          </button>
        ))}
      </div>
    </div>
  );
}
