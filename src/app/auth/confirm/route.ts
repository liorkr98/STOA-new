import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sameOriginPath } from "@/lib/pwa/urls";
import { postAuthPath } from "@/lib/auth/post-auth";

/**
 * Where the links in Stoa's own auth emails land.
 *
 * The email carries a one-time token hash (`{{ .TokenHash }}`) instead of
 * Supabase's hosted verify link, and this route redeems it server-side. That
 * has two consequences that matter: the session cookie is set in the same
 * response, so someone who just proved they own the address lands on Today
 * already signed in; and it works from any browser or device, because
 * nothing depends on a code verifier left behind by the sign-up tab.
 *
 * A password-reset link comes through here too (`type=recovery`) and lands
 * on the page that sets the new password, signed in.
 */
const TYPES = new Set<EmailOtpType>(["signup", "recovery", "email_change", "email", "magiclink", "invite"]);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const rawType = url.searchParams.get("type") as EmailOtpType | null;
  const type = rawType && TYPES.has(rawType) ? rawType : null;
  const next = sameOriginPath(url.searchParams.get("next"), "");

  const back = (reason: string) => {
    const dest = new URL("/sign-in", url.origin);
    dest.searchParams.set("error", "confirm");
    dest.searchParams.set("reason", reason.slice(0, 300));
    return NextResponse.redirect(dest);
  };

  if (!tokenHash || !type) return back("The link is incomplete.");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  if (error) return back(error.message);

  await supabase.rpc("ensure_user_profile");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (type === "recovery") {
    return NextResponse.redirect(new URL(next || "/reset-password", url.origin));
  }

  const dest = next || (user ? await postAuthPath(supabase, user.id) : "/home");
  return NextResponse.redirect(new URL(dest, url.origin));
}
