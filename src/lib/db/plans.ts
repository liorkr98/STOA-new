import { createClient } from "@/lib/supabase/server";

/**
 * Subscription plans (Part C). The only place plans are read/written. RLS scopes
 * every mutation to the plan's creator; reads are public (the storefront shows
 * plans). rank 0 is the free tier.
 */

export interface Plan {
  id: string;
  creator_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  interval: "month" | "year";
  rank: number;
  perks: string[];
  trial_days: number;
  is_archived: boolean;
  created_at: string;
}

export interface PlanInput {
  name: string;
  description?: string | null;
  price_cents: number;
  interval: "month" | "year";
  rank: number;
  perks?: string[];
  trial_days?: number;
}

const COLUMNS =
  "id, creator_id, name, description, price_cents, interval, rank, perks, trial_days, is_archived, created_at";

function normalize(row: Record<string, unknown>): Plan {
  return {
    ...(row as Plan),
    perks: Array.isArray(row.perks) ? (row.perks as string[]) : [],
  };
}

/** A creator's plans, ordered by rank. Excludes archived unless asked. */
export async function listPlansForCreator(
  creatorId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Plan[]> {
  const supabase = await createClient();
  let query = supabase
    .from("plans")
    .select(COLUMNS)
    .eq("creator_id", creatorId)
    .order("rank", { ascending: true });
  if (!opts.includeArchived) query = query.eq("is_archived", false);
  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(normalize);
}

/** Active (non-archived) plans for the public storefront, ordered by rank. */
export async function listActivePlans(creatorId: string): Promise<Plan[]> {
  return listPlansForCreator(creatorId, { includeArchived: false });
}

export async function createPlan(input: PlanInput): Promise<Plan | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("plans")
    .insert({
      creator_id: user.id,
      name: input.name,
      description: input.description ?? null,
      price_cents: input.price_cents,
      interval: input.interval,
      rank: input.rank,
      perks: input.perks ?? [],
      trial_days: input.trial_days ?? 0,
    })
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return normalize(data);
}

export async function updatePlan(
  id: string,
  patch: Partial<PlanInput> & { is_archived?: boolean },
): Promise<Plan | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plans")
    .update(patch)
    .eq("id", id)
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return normalize(data);
}

export async function archivePlan(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("plans").update({ is_archived: true }).eq("id", id);
  return !error;
}

/** Persist a new rank order (drag-reorder). RLS ensures only the owner's rows update. */
export async function reorderPlans(orderedIds: string[]): Promise<boolean> {
  const supabase = await createClient();
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase.from("plans").update({ rank: i }).eq("id", orderedIds[i]);
    if (error) return false;
  }
  return true;
}
