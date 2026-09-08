import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getConsentRedirectPath } from "@/app/actions/consent";
import type { ProfileConfig } from "@/lib/editor/types";

/**
 * Where a freshly signed-in person goes: the consent wall if they still owe
 * it, onboarding if they are an investor with no interests yet, otherwise
 * Today. One place, used by the password sign-in, the OAuth callback and the
 * email-confirmation route, so the three can never disagree.
 */
export async function postAuthPath(supabase: SupabaseClient, userId: string): Promise<string> {
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
