"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

import type { ProfileConfig } from "@/lib/editor/types";

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to continue");
  return { supabase, userId: user.id, user };
}

/** Creates profile + wallet if the signup trigger didn't run. Safe to call repeatedly. */
export async function ensureProfile() {
  const { supabase } = await requireUser();
  const { data, error } = await supabase.rpc("ensure_user_profile");
  if (error) return { ok: false as const, error: error.message };
  const row = data as { error?: string };
  if (row.error) return { ok: false as const, error: row.error };
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function becomeAnalyst(formData: FormData) {
  const { supabase, userId } = await requireUser();
  await supabase.rpc("ensure_user_profile");

  const headline = String(formData.get("headline") ?? "").slice(0, 160);
  const subPrice = Number(formData.get("sub_price") ?? 0) || null;
  const reportPrice = Number(formData.get("report_price") ?? 0) || null;

  const { error } = await supabase
    .from("profiles")
    .update({
      role: "analyst",
      headline: headline || null,
      sub_price: subPrice,
      report_price: reportPrice,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/studio");
  redirect("/studio/compose");
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

export async function updateAvatarUrl(url: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ avatar_url: url }).eq("id", userId);
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  revalidatePath("/settings");
  revalidatePath("/settings/branding");
  if (data?.handle) revalidatePath(`/analyst/${data.handle}`);
}

export async function updateCoverUrl(url: string) {
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ cover_url: url }).eq("id", userId);
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  revalidatePath("/settings/branding");
  if (data?.handle) revalidatePath(`/analyst/${data.handle}`);
}

export async function updateProfileConfig(config: ProfileConfig) {
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ profile_config: config }).eq("id", userId);
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  revalidatePath("/settings/branding");
  if (data?.handle) revalidatePath(`/analyst/${data.handle}`);
}
