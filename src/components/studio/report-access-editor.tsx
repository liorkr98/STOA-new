"use client";

import { useState, useTransition } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Lock } from "lucide-react";
import { updateReportAccess } from "@/app/actions/reports";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import type { Plan } from "@/lib/db/plans";
import { PlanTierSelect, formatReportAccess } from "@/components/profile/plan-tier-select";
import type { AccessType, Report } from "@/lib/types";

const inputClass =
  "h-9 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm focus-ring";

export function ReportAccessEditor({
  report,
  plans,
}: {
  report: Pick<Report, "id" | "access" | "price" | "min_plan_rank">;
  plans: Plan[];
}) {
  const [open, setOpen] = useState(false);
  const [access, setAccess] = useState<AccessType>(report.access);
  const [minPlanRank, setMinPlanRank] = useState(report.min_plan_rank ?? 0);
  const [price, setPrice] = useState(report.price ?? 7);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    start(async () => {
      const res = await updateReportAccess({
        id: report.id,
        access,
        price: access === "paid" ? price : null,
        min_plan_rank: access === "subscribers" ? minPlanRank : 0,
      });
      if (!res.ok) {
        setError(res.error ?? "Could not save");
        return;
      }
      setOpen(false);
    });
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-text-mute transition-colors hover:border-accent hover:text-text focus-ring",
          )}
        >
          <Lock size={11} />
          {formatReportAccess(access, minPlanRank, plans)}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={8}
          className="z-50 w-72 rounded-[var(--radius-card)] border border-border bg-surface p-4 shadow-[var(--shadow-card)]"
        >
          <p className="t-eyebrow mb-2">Report access</p>
          <div className="flex flex-col gap-1.5 text-sm">
            {(
              [
                { key: "free", label: "Free" },
                { key: "subscribers", label: "Subscribers" },
                { key: "paid", label: "Paid unlock" },
              ] as { key: AccessType; label: string }[]
            ).map((a) => (
              <label
                key={a.key}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-[var(--radius-btn)] border px-3 py-2",
                  access === a.key ? "border-accent bg-accent-weak" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name={`access-${report.id}`}
                  checked={access === a.key}
                  onChange={() => setAccess(a.key)}
                  className="accent-[var(--accent)]"
                />
                <span className="text-sm">{a.label}</span>
              </label>
            ))}
          </div>
          {access === "paid" && (
            <label className="mt-2 block text-xs text-text-mute">
              Price
              <input
                type="number"
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className={cn(inputClass, "num mt-1")}
              />
            </label>
          )}
          {access === "subscribers" && (
            <PlanTierSelect plans={plans} value={minPlanRank} onChange={setMinPlanRank} />
          )}
          {error ? <p className="mt-2 text-xs text-[var(--down)]">{error}</p> : null}
          <Button type="button" size="sm" className="mt-3 w-full" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save access"}
          </Button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
