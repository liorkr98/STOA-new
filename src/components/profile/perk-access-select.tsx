"use client";

import { cn } from "@/lib/design/cn";
import type { Plan } from "@/lib/db/plans";
import { collectAnalystPerks, type AnalystPerk } from "@/lib/perks";

/**
 * Pick which perks a subscriber's plan must include (in addition to tier rank).
 * Perks are defined on each subscription tier in Branding.
 */
export function PerkAccessSelect({
  plans,
  value,
  onChange,
}: {
  plans: Plan[];
  value: string[];
  onChange: (slugs: string[]) => void;
}) {
  const perks = collectAnalystPerks(plans);

  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter((s) => s !== slug) : [...value, slug]);
  }

  if (perks.length === 0) {
    return (
      <p className="t-meta mt-2 text-[11px]">
        Add perks to your tiers in{" "}
        <a href="/studio/branding" className="text-accent hover:underline">
          Branding
        </a>{" "}
        to gate reports by perk.
      </p>
    );
  }

  return (
    <div className="mt-2.5">
      <p className="t-meta mb-1.5 text-[11px]">Required perks (subscriber plan must include)</p>
      <div className="flex flex-wrap gap-1.5">
        {perks.map((perk) => (
          <PerkChip
            key={perk.slug}
            perk={perk}
            active={value.includes(perk.slug)}
            onToggle={() => toggle(perk.slug)}
          />
        ))}
      </div>
      {value.length > 0 ? (
        <p className="t-meta mt-1.5 text-[11px] text-text-mute">
          Reader needs all selected perks on their subscription tier.
        </p>
      ) : null}
    </div>
  );
}

function PerkChip({
  perk,
  active,
  onToggle,
}: {
  perk: AnalystPerk;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      title={`On tiers: ${perk.tiers.join(", ")}`}
      onClick={onToggle}
      className={cn(
        "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-ring",
        active
          ? "border-accent bg-accent-weak text-accent"
          : "border-border text-text-mute hover:border-border-strong hover:text-text",
      )}
    >
      {perk.label}
    </button>
  );
}
