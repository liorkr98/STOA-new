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
