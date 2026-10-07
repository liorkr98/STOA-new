"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/ratelimit";
import type { SpendResult } from "@/lib/types";

/**
 * Money mutations route through the `*_idem` RPCs (migration 0046). The caller
 * may pass a stable `clientRequestId` (UUID) so a double-submit or a mobile
 * retry of the same user action can never double-charge - the guarantee is a
 * Postgres unique key, not Redis. When omitted we mint one per invocation,
 * which still protects against internal retries of that single call.
 */

async function moneyLimit(userId: string): Promise<string | null> {
  const rl = await rateLimit("money", userId, { limit: 30, windowSeconds: 3600 });
  return rl.success ? null : "Too many payment attempts. Wait a few minutes.";
}

export async function purchaseReport(
  reportId: string,
  clientRequestId?: string,
): Promise<SpendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue" };
  const limited = await moneyLimit(user.id);
  if (limited) return { error: limited };
  const { data, error } = await supabase.rpc("purchase_report_idem", {
    p_report_id: reportId,
    p_client_request_id: clientRequestId ?? randomUUID(),
  });
  if (error) return { error: error.message };
  revalidatePath(`/report/${reportId}`);
  revalidatePath("/wallet");
  return data as SpendResult;
}

export async function topUp(amount: number, clientRequestId?: string): Promise<SpendResult> {
  void amount;
  void clientRequestId;
  return { error: "Demo top-up is disabled. Purchases go through PayPal." };
}

/** Plan-aware subscribe (Part C). Free tiers and trials move no money. */
export async function subscribeToPlan(
  planId: string,
  handle?: string,
  clientRequestId?: string,
): Promise<SpendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue" };
  const limited = await moneyLimit(user.id);
  if (limited) return { error: limited };
  const { data, error } = await supabase.rpc("subscribe_to_plan_idem", {
    p_plan_id: planId,
    p_client_request_id: clientRequestId ?? randomUUID(),
  });
  if (error) return { error: error.message };
  if (handle) revalidatePath(`/analyst/${handle}`);
  revalidatePath("/wallet");
  return data as SpendResult;
}

export async function subscribeToAnalyst(
  analystId: string,
  handle?: string,
  clientRequestId?: string,
): Promise<SpendResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to continue" };
  const limited = await moneyLimit(user.id);
  if (limited) return { error: limited };
  const { data, error } = await supabase.rpc("subscribe_to_analyst_idem", {
    p_analyst_id: analystId,
    p_client_request_id: clientRequestId ?? randomUUID(),
  });
  if (error) return { error: error.message };
  if (handle) revalidatePath(`/analyst/${handle}`);
  revalidatePath("/wallet");
  return data as SpendResult;
}

export async function convertToCredits(usd: number) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in to continue" };
  const limited = await moneyLimit(user.id);
  if (limited) return { ok: false as const, error: limited };
  const { data, error } = await supabase.rpc("convert_to_ai_credits", { p_usd: usd });
  if (error) return { ok: false as const, error: error.message };
  const row = data as { error?: string; credits_added?: number };
  if (row.error) return { ok: false as const, error: row.error };
  revalidatePath("/wallet");
  revalidatePath("/studio/compose");
  return { ok: true as const, credits: row.credits_added };
}
