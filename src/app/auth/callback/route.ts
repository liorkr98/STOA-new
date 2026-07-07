import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback. Supabase redirects here with a PKCE code after Google /
 * Apple / LinkedIn / X sign-in; we exchange it for a session, make sure the
 * profile + wallet rows exist (OAuth users skip the signup trigger path), and
 * honor a referral handle -- same behavior as the email sign-in action.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";
  const refHandle = url.searchParams.get("ref")?.trim().toLowerCase().replace(/^@/, "");
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", url.origin));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/sign-in?error=oauth", url.origin));
  }

  await supabase.rpc("ensure_user_profile");

  if (refHandle) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
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
  }

  return NextResponse.redirect(new URL(safeNext, url.origin));
}
