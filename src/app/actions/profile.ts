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

/** Submit an analyst application — replaces the old one-click becomeAnalyst. */
export async function submitAnalystApplication(formData: FormData) {
  const { supabase, userId } = await requireUser();
  await supabase.rpc("ensure_user_profile");

  const why_analyst    = String(formData.get("why_analyst") ?? "").trim().slice(0, 1000);
  const background     = String(formData.get("background") ?? "").trim().slice(0, 1000);
  const coverage_areas = String(formData.get("coverage_areas") ?? "").trim().slice(0, 500);
  const sample_thesis  = String(formData.get("sample_thesis") ?? "").trim().slice(0, 2000) || null;
  const linkedin_url   = String(formData.get("linkedin_url") ?? "").trim().slice(0, 300) || null;

  if (!why_analyst || !background || !coverage_areas) {
    throw new Error("Please fill in all required fields");
  }

  // Upsert so re-submission replaces a rejected application
  const { error } = await supabase
    .from("analyst_applications")
    .upsert(
      { user_id: userId, why_analyst, background, coverage_areas, sample_thesis, linkedin_url, status: "pending", submitted_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) throw new Error(error.message);

  revalidatePath("/become-analyst");
  redirect("/become-analyst?submitted=1");
}

/** Admin: approve an application. */
export async function approveAnalystApplication(applicationId: string, note?: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("approve_analyst_application", {
    p_application_id: applicationId,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/applications");
}

/** Admin: reject an application. */
export async function rejectAnalystApplication(applicationId: string, note?: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.rpc("reject_analyst_application", {
    p_application_id: applicationId,
    p_note: note ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/applications");
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
