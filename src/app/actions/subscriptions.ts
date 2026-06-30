"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function cancelSubscription(analystId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("cancel_subscription", {
    p_analyst_id: analystId,
  });
  if (error) return { error: error.message };
  revalidatePath("/subscriptions");
  return data as { status?: string; error?: string };
}
