import "server-only";

import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type ExtensionSession = {
  accessToken: string;
  refreshToken: string;
  /** Unix seconds. */
  expiresAt: number;
  userId: string;
  email: string | null;
};

function anon() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * A session of the extension's own for someone already signed in on the
 * site. The site's session is never handed over: refreshing one session from
 * two places makes Supabase revoke it, signing the reader out of the site.
 * So the server makes a second session for the same account (a one-time
 * sign-in link it redeems itself; no email is sent), which the extension
 * refreshes on its own.
 */
export async function mintExtensionSession(email: string): Promise<ExtensionSession> {
  const { data: link, error } = await createAdminClient().auth.admin.generateLink({ type: "magiclink", email });
  if (error || !link.properties?.hashed_token) throw new Error(error?.message ?? "Could not start a session");
  const { data, error: verifyError } = await anon().auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" });
  if (verifyError || !data.session || !data.user) throw new Error(verifyError?.message ?? "Could not start a session");
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + data.session.expires_in,
    userId: data.user.id,
    email: data.user.email ?? null,
  };
}

export async function refreshExtensionSession(refreshToken: string): Promise<ExtensionSession | null> {
  const { data, error } = await anon().auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session || !data.user) return null;
  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresAt: data.session.expires_at ?? Math.floor(Date.now() / 1000) + data.session.expires_in,
    userId: data.user.id,
    email: data.user.email ?? null,
  };
}
