import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client. Bypasses RLS. Server-only: never import into a client
 * component or a file that ships to the browser. Used by seed + grading jobs.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
