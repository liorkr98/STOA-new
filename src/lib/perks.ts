import type { Plan } from "@/lib/db/plans";

/** Normalize a perk label to a stable slug for gating. */
export function perkSlug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface AnalystPerk {
  slug: string;
  label: string;
  /** Tier names that include this perk (for display). */
  tiers: string[];
}

/** Unique perks defined across an analyst's subscription tiers. */
export function collectAnalystPerks(plans: Plan[]): AnalystPerk[] {
  const map = new Map<string, AnalystPerk>();
  for (const plan of plans) {
    for (const label of plan.perks) {
      const trimmed = label.trim();
      if (!trimmed) continue;
      const slug = perkSlug(trimmed);
      if (!slug) continue;
      const existing = map.get(slug);
      if (existing) {
        if (!existing.tiers.includes(plan.name)) existing.tiers.push(plan.name);
      } else {
        map.set(slug, { slug, label: trimmed, tiers: [plan.name] });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
}

/** Whether a plan's perk list satisfies all required perk slugs. */
export function planHasRequiredPerks(planPerks: string[], requiredSlugs: string[]): boolean {
  if (requiredSlugs.length === 0) return true;
  const planSlugs = new Set(planPerks.map(perkSlug));
  return requiredSlugs.every((req) => planSlugs.has(req));
}
