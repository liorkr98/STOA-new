"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { SpendResult } from "@/lib/types";

export async function purchaseReport(reportId: string): Promise<SpendResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("purchase_report", { p_report_id: reportId });
  if (error) return { error: error.message };
  revalidatePath(`/report/${reportId}`);
  revalidatePath("/wallet");
  return data as SpendResult;
}

export async function topUp(amount: number): Promise<SpendResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("top_up", { p_amount: amount });
  if (error) return { error: error.message };
  revalidatePath("/wallet");
  return data as SpendResult;
}

export async function subscribeToAnalyst(
  analystId: string,
  handle?: string,
): Promise<SpendResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("subscribe_to_analyst", {
    p_analyst_id: analystId,
  });
  if (error) return { error: error.message };
  if (handle) revalidatePath(`/analyst/${handle}`);
  revalidatePath("/wallet");
  return data as SpendResult;
}

export async function convertToCredits(usd: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("convert_to_ai_credits", { p_usd: usd });
  if (error) return { ok: false as const, error: error.message };
  const row = data as { error?: string; credits_added?: number };
  if (row.error) return { ok: false as const, error: row.error };
  revalidatePath("/wallet");
  revalidatePath("/studio/compose");
  return { ok: true as const, credits: row.credits_added };
}
