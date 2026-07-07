"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import {
  archivePlanAction,
  createPlanAction,
  reorderPlansAction,
  updatePlanAction,
} from "@/app/actions/plans";
import type { Plan } from "@/lib/db/plans";

/**
 * Plan manager (Part C): unlimited subscription tiers with drag-order (rank),
 * inline edit, monthly/annual, free trials, and a perks list. Additive to the
 * legacy PricingPanel scalars; the storefront subscribe flow moves onto plans
 * via subscribe_to_plan. rank 0 is the free tier. 90/10 split is repeated here.
 */

const inputClass =
  "h-10 w-full rounded-[var(--radius-btn)] border border-border bg-bg px-3 text-sm focus-ring";

export function PlanManager({
  initialPlans,
  handle,
}: {
  initialPlans: Plan[];
  handle?: string;
}) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [pending, start] = useTransition();

  function addTier() {
    start(async () => {
      const plan = await createPlanAction(
        {
          name: plans.length === 0 ? "Free" : "New tier",
          price_cents: 0,
          interval: "month",
          rank: plans.length,
          perks: [],
          trial_days: 0,
        },
        handle,
      );
      if (plan) setPlans((prev) => [...prev, plan]);
    });
  }

  function move(index: number, dir: -1 | 1) {
    const to = index + dir;
    if (to < 0 || to >= plans.length) return;
    const next = [...plans];
    [next[index], next[to]] = [next[to], next[index]];
    setPlans(next);
    start(async () => {
      await reorderPlansAction(
        next.map((p) => p.id),
        handle,
      );
    });
  }

  function savePlan(id: string, patch: Partial<Plan>) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    start(async () => {
      await updatePlanAction(
        id,
        {
          name: patch.name,
          description: patch.description ?? null,
          price_cents: patch.price_cents,
          interval: patch.interval,
          trial_days: patch.trial_days,
          perks: patch.perks,
        },
        handle,
      );
    });
  }

  function archive(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
    start(async () => {
      await archivePlanAction(id, handle);
    });
  }

  return (
    <div className="surface flex flex-col gap-5 p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="t-h3">Subscription tiers</h2>
          <p className="t-meta mt-1">
            Offer multiple tiers. Drag to reorder; rank 0 is your free tier. Existing subscribers
            keep their locked-in price.
          </p>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={addTier} disabled={pending}>
          <Plus size={15} /> Add tier
        </Button>
      </div>

      {plans.length === 0 ? (
        <p className="rounded-[var(--radius-btn)] border border-dashed border-border bg-bg px-3 py-6 text-center text-sm text-text-mute">
          No tiers yet. Add your first tier to start selling subscriptions.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {plans.map((plan, i) => (
            <PlanRow
              key={plan.id}
              plan={plan}
              index={i}
              count={plans.length}
              pending={pending}
              onMove={move}
              onSave={savePlan}
              onArchive={archive}
            />
          ))}
        </div>
      )}

      <p className="rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm text-text-mute">
        Stoa takes 10% of what you earn. You keep 90%.
      </p>
    </div>
  );
}

function PlanRow({
  plan,
  index,
  count,
  pending,
  onMove,
  onSave,
  onArchive,
}: {
  plan: Plan;
  index: number;
  count: number;
  pending: boolean;
  onMove: (index: number, dir: -1 | 1) => void;
  onSave: (id: string, patch: Partial<Plan>) => void;
  onArchive: (id: string) => void;
}) {
  const [name, setName] = useState(plan.name);
  const [description, setDescription] = useState(plan.description ?? "");
  const [dollars, setDollars] = useState(String((plan.price_cents / 100).toFixed(2)));
  const [interval, setInterval] = useState<Plan["interval"]>(plan.interval);
  const [trialDays, setTrialDays] = useState(String(plan.trial_days ?? 0));
  const [perks, setPerks] = useState<string[]>(plan.perks);
  const [perkDraft, setPerkDraft] = useState("");
  const [saved, setSaved] = useState(false);

  function addPerk() {
    const p = perkDraft.trim();
    if (!p) return;
    setPerks((prev) => [...prev, p]);
    setPerkDraft("");
  }

  function save() {
    setSaved(false);
    onSave(plan.id, {
      name: name.trim() || "Tier",
      description: description.trim() || null,
      price_cents: Math.max(0, Math.round(Number(dollars) * 100) || 0),
      interval,
      trial_days: Math.max(0, Math.round(Number(trialDays)) || 0),
      perks,
    });
    setSaved(true);
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg p-4">
      <div className="flex items-center gap-2">
        <div className="flex flex-col">
          <button
            type="button"
            aria-label="Move up"
            disabled={index === 0}
            onClick={() => onMove(index, -1)}
            className="text-text-faint hover:text-text disabled:opacity-30 focus-ring"
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            aria-label="Move down"
            disabled={index === count - 1}
            onClick={() => onMove(index, 1)}
            className="text-text-faint hover:text-text disabled:opacity-30 focus-ring"
          >
            <ChevronDown size={14} />
          </button>
        </div>
        <span className="t-eyebrow">Rank {index}</span>
        {index === 0 && <span className="t-meta text-[11px]">free tier</span>}
        <button
          type="button"
          aria-label="Archive tier"
          onClick={() => onArchive(plan.id)}
          className="ml-auto text-text-faint hover:text-[var(--down)] focus-ring"
        >
          <Trash2 size={15} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Name
          <input value={name} onChange={(e) => setName(e.target.value)} className={cn(inputClass, "mt-1")} />
        </label>
        <label className="text-sm">
          Price
          <div className="mt-1 flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
                $
              </span>
              <input
                type="number"
                min={0}
                step={1}
                value={dollars}
                onChange={(e) => setDollars(e.target.value)}
                className={cn(inputClass, "num pl-7")}
              />
            </div>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value as Plan["interval"])}
              className="h-10 rounded-[var(--radius-btn)] border border-border bg-bg px-2 text-sm focus-ring"
            >
              <option value="month">/mo</option>
              <option value="year">/yr</option>
            </select>
          </div>
        </label>
        <label className="text-sm">
          Description
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className={cn(inputClass, "mt-1")}
          />
        </label>
        <label className="text-sm">
          Free trial (days)
          <input
            type="number"
            min={0}
            step={1}
            value={trialDays}
            onChange={(e) => setTrialDays(e.target.value)}
            className={cn(inputClass, "num mt-1")}
          />
        </label>
      </div>

      <div className="mt-3">
        <span className="t-eyebrow">Perks</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {perks.map((perk, pi) => (
            <span
              key={`${perk}-${pi}`}
              className="inline-flex items-center gap-1 rounded-[var(--radius-tag)] border border-border bg-surface px-2 py-0.5 text-[11px] text-text-mute"
            >
              {perk}
              <button
                type="button"
                aria-label={`Remove ${perk}`}
                onClick={() => setPerks((prev) => prev.filter((_, x) => x !== pi))}
                className="text-text-faint hover:text-[var(--down)]"
              >
                <X size={11} />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={perkDraft}
            onChange={(e) => setPerkDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPerk())}
            placeholder="Add a perk (e.g. Full reports)"
            className={cn(inputClass, "flex-1")}
          />
          <Button type="button" variant="ghost" size="sm" onClick={addPerk}>
            Add
          </Button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1">
          {["Full reports", "Deep dives", "Video access", "Live calls", "Model downloads"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                if (!perks.includes(s)) setPerks((prev) => [...prev, s]);
              }}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-[10px] text-text-mute hover:border-accent hover:text-text"
            >
              + {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Button type="button" size="sm" onClick={save} disabled={pending}>
          {pending ? "Saving..." : "Save tier"}
        </Button>
        {saved && !pending && <span className="text-sm text-[var(--up)]">Saved</span>}
      </div>
    </div>
  );
}
