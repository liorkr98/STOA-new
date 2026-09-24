import type { SupabaseClient } from "@supabase/supabase-js";

/** Marks active subscriptions past renews_at as expired. Returns rows updated. */
export async function expireSubscriptions(db: SupabaseClient): Promise<number> {
  const { data, error } = await db.rpc("expire_subscriptions");
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}
