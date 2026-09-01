import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ProfileConfig } from "@/lib/editor/types";
import { getConsentRedirectPath } from "@/app/actions/consent";
import { sameOriginPath } from "@/lib/pwa/urls";

/**
 * OAuth callback. Supabase redirects here with a PKCE code after Google /
 * Apple / LinkedIn / X sign-in; we exchange it for a session, make sure the
 * profile + wallet rows exist (OAuth users skip the signup trigger path), and
 * honor a referral handle -- same behavior as the email sign-in action.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next");
  const refHandle = url.searchParams.get("ref")?.trim().toLowerCase().replace(/^@/, "");
  const explicitNext = sameOriginPath(next, "");
  const safeNext = explicitNext || null;

  // Supabase reports a failed provider exchange by redirecting here with an
  // error instead of a code. Dropping it (as this used to) made every OAuth
  // failure look like nothing had happened: the user landed back on sign-in
  // with no explanation, and the actual reason was never seen by anyone.
  const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (providerError) {
    const back = new URL("/sign-in", url.origin);
    back.searchParams.set("error", "oauth");
    back.searchParams.set("reason", providerError.slice(0, 300));
    return NextResponse.redirect(back);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const back = new URL("/sign-in", url.origin);
    back.searchParams.set("error", "oauth");
    back.searchParams.set("reason", error.message.slice(0, 300));
    return NextResponse.redirect(back);
  }

  await supabase.rpc("ensure_user_profile");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (refHandle && user) {
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

  let dest = safeNext ?? "/home";
  if (!safeNext && user) {
    const consentPath = await getConsentRedirectPath(user.id);
    if (consentPath) {
      dest = consentPath;
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, profile_config")
        .eq("id", user.id)
        .maybeSingle();
      if (profile && profile.role !== "analyst" && profile.role !== "admin") {
        const interests = (profile.profile_config as ProfileConfig | null)?.interests;
        if (!interests || interests.length === 0) dest = "/onboarding/investor";
      }
    }
  }

  return NextResponse.redirect(new URL(dest, url.origin));
}
