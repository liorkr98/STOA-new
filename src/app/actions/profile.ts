"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { alertAnalystApplication } from "@/lib/slack/alerts";

import type { ProfileConfig } from "@/lib/editor/types";
import { checkAccent } from "@/lib/profile/accent";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in" };

  const { data, error } = await supabase.rpc("ensure_user_profile");
  if (error) return { ok: false as const, error: error.message };
  const row = data as { error?: string };
  if (row.error) return { ok: false as const, error: row.error };
  return { ok: true as const };
}

// ── Analyst application (review-gated flow from main) ─────────────────────

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

  const { data: application, error } = await supabase
    .from("analyst_applications")
    .upsert(
      { user_id: userId, why_analyst, background, coverage_areas, sample_thesis, linkedin_url, status: "pending", submitted_at: new Date().toISOString() },
      { onConflict: "user_id" }
    )
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, handle")
    .eq("id", userId)
    .single();

  if (application && profile) {
    await alertAnalystApplication({
      applicationId: application.id,
      displayName: profile.display_name,
      handle: profile.handle,
      coverageAreas: coverage_areas,
    });
  }

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
  revalidatePath("/become-analyst");
  revalidatePath("/studio");
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
  revalidatePath("/become-analyst");
  revalidatePath("/studio");
}

// ── Analyst onboarding wizard (post-approval) ─────────────────────────────

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

/**
 * Save (or clear) the custom storefront accent + font pairing (B1/B2). The
 * accent is validated for WCAG AA vs --paper; an invalid hue is rejected.
 * Merges into profile_config without disturbing other keys.
 */
export async function saveStorefrontBranding({
  accent,
  fontPairing,
  layout,
  texture,
}: {
  accent?: string | null;
  fontPairing?: ProfileConfig["font_pairing"];
  layout?: ProfileConfig["layout"];
  texture?: boolean;
}) {
  const { supabase, userId } = await requireUser();

  let accentHex: string | null | undefined;
  if (accent === null || accent === "") {
    accentHex = null;
  } else if (typeof accent === "string") {
    const check = checkAccent(accent);
    if (!check.valid) return { ok: false as const, error: check.reason ?? "Invalid accent" };
    accentHex = check.hex;
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("profile_config, handle")
    .eq("id", userId)
    .single();

  const config: ProfileConfig = { ...(existing?.profile_config ?? {}) };
  if (accentHex !== undefined) config.accent = accentHex ?? undefined;
  if (fontPairing !== undefined) config.font_pairing = fontPairing;
  if (layout !== undefined) config.layout = layout;
  if (texture !== undefined) config.texture = texture;

  const { error } = await supabase
    .from("profiles")
    .update({ profile_config: config })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/studio/branding");
  if (existing?.handle) revalidatePath(`/analyst/${existing.handle}`);
  return { ok: true as const };
}

/**
 * Save the addable storefront sections (B3). Merge-safe: touches only the
 * storefront_sections key, never the rest of profile_config.
 */
export async function saveStorefrontSections(sections: ProfileConfig["storefront_sections"]) {
  const { supabase, userId } = await requireUser();
  const { data: existing } = await supabase
    .from("profiles")
    .select("profile_config, handle")
    .eq("id", userId)
    .single();

  const config: ProfileConfig = {
    ...(existing?.profile_config ?? {}),
    storefront_sections: sections ?? [],
  };

  const { error } = await supabase
    .from("profiles")
    .update({ profile_config: config })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/studio/branding");
  if (existing?.handle) revalidatePath(`/analyst/${existing.handle}`);
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
    .update({ sub_price: subPrice, report_price: reportPrice })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/studio");
  redirect("/studio/compose?onboarding=1");
}

// ── General profile actions ───────────────────────────────────────────────

export async function updateProfile(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const display_name = String(formData.get("display_name") ?? "");
  const bio = String(formData.get("bio") ?? "").slice(0, 500);
  const headline = String(formData.get("headline") ?? "").slice(0, 160);

  // Pricing lives in Storefront now; only touch it when the form actually sends
  // it, so saving profile fields from Settings never wipes stored prices.
  const update: Record<string, unknown> = { display_name, bio, headline };
  if (formData.has("sub_price")) update.sub_price = Number(formData.get("sub_price") ?? 0) || null;
  if (formData.has("report_price")) update.report_price = Number(formData.get("report_price") ?? 0) || null;

  await supabase.from("profiles").update(update).eq("id", userId);
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
  revalidatePath("/studio/branding");
  if (data?.handle) revalidatePath(`/analyst/${data.handle}`);
}

/** Branding studio — identity fields + profile_config in one save. */
export async function saveBrandingStudio({
  display_name,
  headline,
  bio,
  profile_config,
}: {
  display_name: string;
  headline: string;
  bio: string;
  profile_config: ProfileConfig;
}) {
  const { supabase, userId } = await requireUser();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: display_name.trim(),
      headline: headline.trim() || null,
      bio: bio.trim() || null,
      profile_config,
    })
    .eq("id", userId);
  if (error) return { ok: false as const, error: error.message };

  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  revalidatePath("/studio/branding");
  revalidatePath("/settings/branding");
  revalidatePath("/settings");
  if (data?.handle) revalidatePath(`/analyst/${data.handle}`);
  return { ok: true as const };
}

/** Pricing tab in branding studio — subscription + per-report prices. */
export async function saveBrandingPricing({
  sub_price,
  report_price,
}: {
  sub_price: number | null;
  report_price: number | null;
}) {
  const { supabase, userId } = await requireUser();
  await supabase.from("profiles").update({ sub_price, report_price }).eq("id", userId);
  revalidatePath("/studio/branding");
  revalidatePath("/settings");
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).single();
  if (data?.handle) revalidatePath(`/analyst/${data.handle}`);
  return { ok: true as const };
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
