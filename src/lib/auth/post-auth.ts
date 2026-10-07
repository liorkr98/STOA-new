import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getConsentRedirectPath } from "@/app/actions/consent";
import type { ProfileConfig } from "@/lib/editor/types";
import { sameOriginPath } from "@/lib/pwa/urls";

/** `path` with the return address attached, when there is one worth carrying. */
function carrying(path: string, next: string | null): string {
  return next ? `${path}?next=${encodeURIComponent(next)}` : path;
}

/**
 * Where a freshly signed-in person goes: the consent wall if they still owe
 * it, onboarding if they are an investor with no interests yet, otherwise
 * Today. One place, used by the password sign-in, the OAuth callback and the
 * email-confirmation route, so the three can never disagree.
 *
 * `next` is where the person was when they were asked to sign in (the Feed's
 * wall sends `/feed`). It is where they end up, after the consent wall and
 * onboarding have had their turn, and both of those carry it on.
 */
export async function postAuthPath(supabase: SupabaseClient, userId: string, next?: string | null): Promise<string> {
  const back = sameOriginPath(next, "") || null;
  const consentPath = await getConsentRedirectPath(userId);
  if (consentPath) return carrying(consentPath, back);

  const { data } = await supabase
    .from("profiles")
    .select("role, profile_config")
    .eq("id", userId)
    .maybeSingle();
  if (!data) return back ?? "/home";
  if (data.role === "analyst" || data.role === "admin") return back ?? "/home";
  const interests = (data.profile_config as ProfileConfig | null)?.interests;
  if (!interests || interests.length === 0) return carrying("/onboarding/investor", back);
  return back ?? "/home";
}
