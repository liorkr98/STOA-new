"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { boostPackage } from "@/lib/profile/boost-packages";

export async function purchaseBoost({
  package_id,
  report_id,
}: {
  package_id: string;
  report_id?: string;
}) {
  const pkg = boostPackage(package_id);
  if (!pkg) return { ok: false as const, error: "Unknown package" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Sign in required" };

  const { data, error } = await supabase.rpc("purchase_boost", {
    p_placement: pkg.placement,
    p_target_type: pkg.target_type,
    p_target_id: pkg.target_type === "report" ? report_id ?? null : null,
    p_hours: pkg.hours,
    p_price: pkg.price,
  });

  if (error) return { ok: false as const, error: error.message };
  const result = data as { error?: string; have?: number; need?: number };
  if (result.error === "insufficient_balance") {
    return {
      ok: false as const,
      error: `Need $${result.need} (you have $${result.have}). Top up in Wallet.`,
    };
  }
  if (result.error) return { ok: false as const, error: result.error };

  revalidatePath("/studio/branding");
  revalidatePath("/feed");
  return { ok: true as const };
}
