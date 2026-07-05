"use server";

import { revalidatePath } from "next/cache";
import {
  archivePlan as dbArchivePlan,
  createPlan as dbCreatePlan,
  reorderPlans as dbReorderPlans,
  updatePlan as dbUpdatePlan,
  type Plan,
  type PlanInput,
} from "@/lib/db/plans";

/**
 * Server actions for the plan manager (Part C). Thin wrappers over src/lib/db/plans
 * that revalidate the studio + storefront after a write. RLS enforces ownership.
 */

function revalidatePlans(handle?: string) {
  revalidatePath("/studio/branding");
  revalidatePath("/studio");
  if (handle) revalidatePath(`/analyst/${handle}`);
}

export async function createPlanAction(input: PlanInput, handle?: string): Promise<Plan | null> {
  const plan = await dbCreatePlan(input);
  revalidatePlans(handle);
  return plan;
}

export async function updatePlanAction(
  id: string,
  patch: Partial<PlanInput> & { is_archived?: boolean },
  handle?: string,
): Promise<Plan | null> {
  const plan = await dbUpdatePlan(id, patch);
  revalidatePlans(handle);
  return plan;
}

export async function archivePlanAction(id: string, handle?: string): Promise<boolean> {
  const ok = await dbArchivePlan(id);
  revalidatePlans(handle);
  return ok;
}

export async function reorderPlansAction(orderedIds: string[], handle?: string): Promise<boolean> {
  const ok = await dbReorderPlans(orderedIds);
  revalidatePlans(handle);
  return ok;
}
