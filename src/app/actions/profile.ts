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

const HANDLE_RE = /^[a-z0-9_]{3,20}$/;

/** Debounced by the caller. Excludes the current user's own row so re-saving an unchanged handle doesn't false-positive. */
export async function checkHandleAvailable(handle: string): Promise<boolean> {
  const { supabase, userId } = await requireUser();
  if (!HANDLE_RE.test(handle)) return false;
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("handle", handle)
    .neq("id", userId)
    .maybeSingle();
  return !data;
}

/** Analyst onboarding step 1 (Brand). Saved immediately rather than held in
 * client state, so a creator can leave and resume the wizard from the
 * backend's profile row instead of losing progress on refresh. */
export async function saveOnboardingBrand({
  handle,
  display_name,
  bio,
  banner_style,
}: {
  handle: string;
  display_name: string;
  bio: string;
  banner_style: string;
}) {
  const { supabase, userId } = await requireUser();
  const cleanHandle = handle.trim().toLowerCase();
  if (!HANDLE_RE.test(cleanHandle)) {
    return { ok: false as const, error: "Handle must be 3-20 characters: letters, numbers, underscore." };
  }
  const available = await checkHandleAvailable(cleanHandle);
  if (!available) return { ok: false as const, error: "That handle is taken." };
  if (!display_name.trim()) return { ok: false as const, error: "Display name is required." };

  const { data: existing } = await supabase
    .from("profiles")
    .select("profile_config")
    .eq("id", userId)
    .single();
  const config: ProfileConfig = {
    ...(existing?.profile_config ?? {}),
    banner_style: banner_style as ProfileConfig["banner_style"],
  };

  const { error } = await supabase
    .from("profiles")
    .update({
      handle: cleanHandle,
      display_name: display_name.trim(),
      bio: bio.slice(0, 140) || null,
      profile_config: config,
    })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/onboarding/analyst");
  return { ok: true as const };
}

/** Analyst onboarding step 2 (Price) + implicit Done. Flips role to analyst
 * and always lands in the guided first-report flow. */
export async function completeAnalystOnboarding(formData: FormData) {
  const { supabase, userId } = await requireUser();

  const subPrice = Number(formData.get("sub_price") ?? 0) || null;
  const reportPrice = Number(formData.get("report_price") ?? 0) || null;

  const { error } = await supabase
    .from("profiles")
    .update({ role: "analyst", sub_price: subPrice, report_price: reportPrice })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/studio");
  redirect("/studio/compose?onboarding=1");
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

/** Merges into the existing profile_config rather than overwriting it --
 * onboarding shouldn't be able to wipe out creator branding fields. */
export async function setInvestorInterests(interests: string[]) {
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("profiles")
    .select("profile_config")
    .eq("id", userId)
    .single();
  const config: ProfileConfig = { ...(existing?.profile_config ?? {}), interests };
  await supabase.from("profiles").update({ profile_config: config }).eq("id", userId);
}
