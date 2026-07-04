"use client";

import { useState, useTransition } from "react";
import { saveBrandingPricing } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";

export function PricingPanel({
  subPrice,
  reportPrice,
}: {
  subPrice: number | null;
  reportPrice: number | null;
}) {
  const [sub, setSub] = useState(subPrice != null ? String(subPrice) : "");
  const [report, setReport] = useState(reportPrice != null ? String(reportPrice) : "");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function save() {
    setSaved(false);
    start(async () => {
      await saveBrandingPricing({
        sub_price: sub ? Number(sub) : null,
        report_price: report ? Number(report) : null,
      });
      setSaved(true);
    });
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div>
        <h2 className="t-h3">Pricing</h2>
        <p className="t-meta mt-1">
          Set what investors pay for access. Existing subscribers keep their locked-in price until
          they change tiers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Monthly subscription
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={sub}
              onChange={(e) => setSub(e.target.value)}
              placeholder="7"
              className="num h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg pl-7 pr-3 text-sm"
            />
            <span className="t-meta absolute right-3 top-1/2 -translate-y-1/2">/mo</span>
          </div>
        </label>
        <label className="text-sm">
          Per-report unlock
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">$</span>
            <input
              type="number"
              min={0}
              step={1}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="7"
              className="num h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg pl-7 pr-3 text-sm"
            />
          </div>
        </label>
      </div>

      <p className="rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm text-text-mute">
        Stoa takes 10% of what you earn. You keep 90%.
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending} onClick={save}>
          {pending ? "Saving..." : "Save pricing"}
        </Button>
        {saved && <span className="text-sm text-[var(--up)]">Saved</span>}
      </div>
    </div>
  );
}
