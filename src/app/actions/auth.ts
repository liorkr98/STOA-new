"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/types";
import type { ProfileConfig } from "@/lib/editor/types";
import { getConsentRedirectPath, recordMarketingOptInIfChecked, recordSignupCompliance } from "@/app/actions/consent";
import { alertNewSignup } from "@/lib/slack/alerts";

/** New investors without interests go to onboarding; everyone else to Today. */
async function postAuthPath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<string> {
  const consentPath = await getConsentRedirectPath(userId);
  if (consentPath) return consentPath;

  const { data } = await supabase
    .from("profiles")
    .select("role, profile_config")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return "/home";
  if (data.role === "analyst" || data.role === "admin") return "/home";
  const interests = (data.profile_config as ProfileConfig | null)?.interests;
  if (!interests || interests.length === 0) return "/onboarding/investor";
  return "/home";
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const refHandle = String(formData.get("ref") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };
  await supabase.rpc("ensure_user_profile");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  if (refHandle) {
    const { data: referrer } = await supabase
      .from("profiles")
      .select("id")
      .eq("handle", refHandle)
      .maybeSingle();
    if (referrer?.id && referrer.id !== user.id) {
      await supabase
        .from("profiles")
        .update({ referred_by: referrer.id })
        .eq("id", user.id)
        .is("referred_by", null);
    }
  }

  await recordMarketingOptInIfChecked(user.id, formData);

  redirect(await postAuthPath(supabase, user.id));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");
  const refHandle = String(formData.get("ref") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");

  if (formData.get("legal_consent") !== "on") {
    return { error: "You must agree to the Terms of Service and Privacy Policy." };
  }
  if (formData.get("age_attestation") !== "on") {
    return { error: "You must confirm you are 18 years of age or older." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: error.message };

  // Session is set on the server when email confirmation is off. If confirmation is
  // required, data.session is null — profile bootstrap runs on first sign-in instead.
  if (data.session && data.user) {
    await supabase.rpc("ensure_user_profile");

    const complianceError = await recordSignupCompliance(data.user.id, {
      marketingOptIn: formData.get("marketing_opt_in") === "on",
    });
    if (complianceError?.error) return complianceError;

    if (refHandle) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("handle", refHandle)
        .maybeSingle();
      if (referrer?.id && referrer.id !== data.user.id) {
        await supabase
          .from("profiles")
          .update({ referred_by: referrer.id })
          .eq("id", data.user.id)
          .is("referred_by", null);
      }
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name, handle")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profile) {
      await alertNewSignup({
        userId: data.user.id,
        email,
        displayName: profile.display_name,
        handle: profile.handle,
      });
    }

    redirect(await postAuthPath(supabase, data.user.id));
  }

  redirect("/sign-in?registered=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
