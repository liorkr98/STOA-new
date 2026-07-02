"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/design/cn";
import { Button } from "@/components/ui/button";
import { completeCreatorOnboarding } from "@/app/actions/profile";

type Mode = "sub" | "report" | "both";

const MODES: { value: Mode; label: string }[] = [
  { value: "sub", label: "Subscription" },
  { value: "report", label: "Per-report" },
  { value: "both", label: "Both" },
];

export function PriceStep({
  subPrice,
  reportPrice,
}: {
  subPrice: number | null;
  reportPrice: number | null;
}) {
  const [mode, setMode] = useState<Mode>(subPrice && reportPrice ? "both" : reportPrice ? "report" : "sub");
  const [sub, setSub] = useState(subPrice ?? 19);
  const [report, setReport] = useState(reportPrice ?? 7);
  const [pending, start] = useTransition();

  const showSub = mode === "sub" || mode === "both";
  const showReport = mode === "report" || mode === "both";

  return (
    <form
      action={(formData) => start(() => completeCreatorOnboarding(formData))}
      className="mx-auto mt-8 flex max-w-md flex-col gap-6"
    >
      <div className="flex gap-2">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => setMode(m.value)}
            aria-pressed={mode === m.value}
            className={cn(
              "flex-1 rounded-[var(--radius-btn)] border px-3 py-2.5 text-sm font-medium transition-colors",
              mode === m.value
                ? "border-accent bg-accent-weak text-accent"
                : "border-border text-text-mute hover:border-border-strong hover:text-text",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      {showSub && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Monthly subscription</span>
          <div className="relative">
            <input
              name="sub_price"
              type="number"
              min={0}
              max={200}
              value={sub}
              onChange={(e) => setSub(Number(e.target.value))}
              className="num h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg pl-7 pr-10 text-sm focus-ring"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">$</span>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-faint">/mo</span>
          </div>
        </label>
      )}

      {showReport && (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">Default per-report price</span>
          <div className="relative">
            <input
              name="report_price"
              type="number"
              min={0}
              max={50}
              value={report}
              onChange={(e) => setReport(Number(e.target.value))}
              className="num h-11 w-full rounded-[var(--radius-btn)] border border-border bg-bg pl-7 pr-3 text-sm focus-ring"
            />
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">$</span>
          </div>
        </label>
      )}

      {!showSub && <input type="hidden" name="sub_price" value={0} />}
      {!showReport && <input type="hidden" name="report_price" value={0} />}

      <div className="rounded-[var(--radius-card)] border border-border bg-surface-2 p-4">
        <p className="text-sm font-medium">Stoa takes 10% of what you earn. You keep 90%.</p>
        <p className="t-meta mt-1">
          Example: a {showSub ? `$${sub}/mo subscriber` : `$${report} report`} pays you{" "}
          {showSub ? `$${(sub * 0.9).toFixed(2)}` : `$${(report * 0.9).toFixed(2)}`}, after the platform fee.
        </p>
      </div>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Saving..." : "Continue"}
      </Button>
    </form>
  );
}
