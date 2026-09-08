"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/types";
import { recordMarketingOptInIfChecked } from "@/app/actions/consent";
import { recordSignupConsentsAsAdmin } from "@/lib/db/legal";
import { alertNewSignup } from "@/lib/slack/alerts";
import { headers } from "next/headers";
import { SITE_URL } from "@/lib/seo/site";
import { postAuthPath } from "@/lib/auth/post-auth";

async function signupIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

/**
 * This request's own origin, for the links Supabase puts in its emails and
 * redirects. The request's host rather than a configured site URL, so a
 * preview deploy and localhost each get links that come back to themselves.
 */
async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return SITE_URL;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
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
  if (error) {
    // Supabase answers "Invalid login credentials" for a wrong password and for
    // an address that has no account, on purpose, so the message cannot say
    // which. Passing it through verbatim left people who had never signed up
    // retrying a password that was never going to work.
    const message = /invalid login credentials/i.test(error.message)
      ? "That email and password do not match an account. If you have not signed up yet, create an account first."
      : error.message;
    return { error: message };
  }
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
    options: {
      data: { display_name: displayName },
      // Where the confirmation link comes back to. Without this the link was
      // governed entirely by the dashboard's Site URL and never reached a
      // route that could turn it into a session, so a person who had just
      // proved they own the address had to sign in again. Supabase's default
      // template lands here with a code; Stoa's own template goes straight
      // to /auth/confirm with a token hash and needs no redirect at all.
      emailRedirectTo: `${await requestOrigin()}/auth/callback?next=%2Fhome`,
    },
  });
  if (error) return { error: error.message };

  // The consents were ticked on this form, so they are recorded here whether or
  // not a session came back. With email confirmation on, data.session is null
  // and the request has no auth.uid(), so this write has to go through the admin
  // client; gating it on the session (as it used to be) silently discarded every
  // confirmed signup's consent and stopped the user at the consent wall on their
  // first sign-in, having already agreed.
  if (data.user) {
    try {
      await recordSignupConsentsAsAdmin(data.user.id, {
        marketingOptIn: formData.get("marketing_opt_in") === "on",
        ipAddress: await signupIp(),
      });
    } catch {
      // The account exists; the consent gate will ask again on first sign-in
      // rather than stranding the signup.
    }
  }

  if (data.session && data.user) {
    await supabase.rpc("ensure_user_profile");

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

/**
 * Forgot password: send the recovery email. The answer is the same whether
 * or not the address has an account, so the form cannot be used to find out.
 */
export async function requestPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Enter the email you signed up with." };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await requestOrigin()}/auth/callback?next=%2Freset-password`,
  });
  redirect("/forgot-password?sent=1");
}

/** Set a new password for the signed-in person (after a recovery link, or from Settings). */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 6) return { error: "Use at least 6 characters." };
  if (password !== confirm) return { error: "The two passwords do not match." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?error=confirm&reason=That%20link%20has%20expired.%20Request%20a%20new%20one%20below.");
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  redirect(await postAuthPath(supabase, user.id));
}
