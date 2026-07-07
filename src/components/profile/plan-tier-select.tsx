"use client";

import { cn } from "@/lib/design/cn";
import type { Plan } from "@/lib/db/plans";

/**
 * Pick which subscription tier unlocks content. Uses plan rank — perks on each
 * tier are shown as hints but gating is by rank (see plans table).
 */
export function PlanTierSelect({
  plans,
  value,
  onChange,
  id = "min-plan-rank",
}: {
  plans: Plan[];
  value: number;
  onChange: (rank: number) => void;
  id?: string;
}) {
  const sorted = [...plans].sort((a, b) => a.rank - b.rank);

  return (
    <div className="mt-2.5">
      <label htmlFor={id} className="t-meta text-[11px]">
        Minimum subscription tier
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={cn(
          "mt-1 h-10 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm focus-ring",
        )}
      >
        <option value={0}>Any subscriber (all tiers)</option>
        {sorted.map((plan) => (
          <option key={plan.id} value={plan.rank}>
            {plan.name}
            {plan.price_cents > 0
              ? ` — $${(plan.price_cents / 100).toFixed(0)}/${plan.interval === "year" ? "yr" : "mo"}`
              : " (free)"}
          </option>
        ))}
      </select>
      {sorted.length === 0 ? (
        <p className="t-meta mt-1.5 text-[11px]">
          No tiers yet — add subscription tiers in{" "}
          <a href="/studio/branding" className="text-accent hover:underline">
            Branding
          </a>
          .
        </p>
      ) : (
        <p className="t-meta mt-1.5 text-[11px]">
          Readers need a plan at or above this tier. Perks on each tier are set in Branding.
        </p>
      )}
    </div>
  );
}

/** Short label for access + tier in lists. */
export function formatReportAccess(
  access: string,
  minPlanRank: number,
  plans: Plan[],
): string {
  if (access === "free") return "Free";
  if (access === "paid") return "Paid unlock";
  if (minPlanRank <= 0) return "Subscribers";
  const plan = [...plans].sort((a, b) => a.rank - b.rank).find((p) => p.rank >= minPlanRank);
  return plan ? `${plan.name}+` : `Tier ${minPlanRank}+`;
}
