import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sameOriginPath } from "@/lib/pwa/urls";
import { postAuthPath } from "@/lib/auth/post-auth";

/**
 * OAuth callback. Supabase redirects here with a PKCE code after Google /
 * Apple / LinkedIn / X sign-in; we exchange it for a session, make sure the
 * profile + wallet rows exist (OAuth users skip the signup trigger path), and
 * honor a referral handle -- same behavior as the email sign-in action.
 *
 * Also the landing for Supabase's default confirmation email, which redirects
 * here with a code once the address is verified; the exchange signs the
 * person in. Stoa's own email templates use /auth/confirm instead, which
 * does not need the sign-up tab's code verifier and so works from any device.
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

  const dest = safeNext ?? (user ? await postAuthPath(supabase, user.id) : "/home");
  return NextResponse.redirect(new URL(dest, url.origin));
}
