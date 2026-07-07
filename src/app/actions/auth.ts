"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AuthState } from "@/lib/types";

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

  redirect("/");
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "");
  const refHandle = String(formData.get("ref") ?? "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  if (error) return { error: error.message };

  // Session is set on the server when email confirmation is off. If confirmation is
  // required, data.session is null — profile bootstrap runs on first sign-in instead.
  if (data.session) {
    await supabase.rpc("ensure_user_profile");

    if (refHandle && data.user?.id) {
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

    redirect("/");
  }

  redirect("/sign-in?registered=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
