import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * True when the request carries a signed-in session holding the admin role.
 *
 * Diagnostic routes are otherwise reachable only with the CRON_SECRET bearer
 * token, so reading one means going to find a secret and assembling a curl.
 * Admins already own those surfaces, so accepting their session as well makes
 * a diagnosis openable in a browser without widening access to anyone else.
 *
 * Returns false rather than throwing: callers use it to choose a status code,
 * and a failed profile read is not an authorisation.
 */
export async function isSignedInAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    return profile?.role === "admin";
  } catch {
    return false;
  }
}
