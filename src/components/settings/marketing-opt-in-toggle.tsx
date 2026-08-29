"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/design/cn";
import { updateMarketingOptIn } from "@/app/actions/marketing";

export function MarketingOptInToggle({ defaultOn }: { defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle() {
    const next = !on;
    setOn(next);
    setError(null);
    start(async () => {
      const res = await updateMarketingOptIn(next);
      if (res?.error) {
        setOn(!next);
        setError(res.error);
      }
    });
  }

  return (
    <div>
      <label className="flex items-center justify-between gap-4 text-sm">
        <span>Product and research emails</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          disabled={pending}
          onClick={toggle}
          className={cn(
            "relative h-6 w-10 shrink-0 rounded-full border transition-colors focus-ring",
            on ? "border-[var(--ink)] bg-[var(--ink)]" : "border-border bg-surface-2",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-[var(--paper)] transition-transform",
              on ? "left-0.5 translate-x-4" : "left-0.5",
            )}
            style={{ height: 18, width: 18 }}
          />
        </button>
      </label>
      <p className="mt-1 text-[0.8125rem] leading-snug text-text-mute">
        Off unless you opt in. Required account mail (sign-in, receipts) is separate.
      </p>
      {error ? (
        <p className="mt-1 text-[0.8125rem] text-[var(--down)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
