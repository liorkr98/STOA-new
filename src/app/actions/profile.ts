"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");
  return { supabase, userId: user.id };
}

export async function becomeAnalyst(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const headline = String(formData.get("headline") ?? "").slice(0, 160);
  const subPrice = Number(formData.get("sub_price") ?? 0) || null;
  const reportPrice = Number(formData.get("report_price") ?? 0) || null;

  await supabase
    .from("profiles")
    .update({
      role: "analyst",
      headline: headline || null,
      sub_price: subPrice,
      report_price: reportPrice,
    })
    .eq("id", userId);

  revalidatePath("/studio");
  redirect("/studio");
}

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const display_name = String(formData.get("display_name") ?? "");
  const bio = String(formData.get("bio") ?? "").slice(0, 500);
  const headline = String(formData.get("headline") ?? "").slice(0, 160);
  const sub_price = Number(formData.get("sub_price") ?? 0) || null;
  const report_price = Number(formData.get("report_price") ?? 0) || null;

  await supabase
    .from("profiles")
    .update({ display_name, bio, headline, sub_price, report_price })
    .eq("id", userId);
  revalidatePath("/studio");
  revalidatePath("/settings");
  return { ok: true };
}
