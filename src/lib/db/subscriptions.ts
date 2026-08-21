import { createClient } from "@/lib/supabase/server";
import type { Profile, Subscription } from "@/lib/types";

export interface SubscriptionWithAnalyst extends Subscription {
  analyst?: Profile;
}

export async function listUserSubscriptions(
  subscriberId: string,
): Promise<SubscriptionWithAnalyst[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("*, analyst:profiles!subscriptions_analyst_id_fkey(*)")
    .eq("subscriber_id", subscriberId)
    .in("status", ["active", "cancelled"])
    .order("started_at", { ascending: false })
    .limit(200);
  const rows = (data as unknown as Record<string, unknown>[]) ?? [];
  return rows.map((row) => {
    const a = row.analyst;
    const analyst = Array.isArray(a) ? (a[0] as Profile) : (a as Profile);
    return { ...(row as unknown as Subscription), analyst };
  });
}

export interface SubscriberRow {
  subscriber_id: string;
  started_at: string;
  renews_at: string;
  status: string;
  subscriber?: Profile;
}

export async function listAnalystSubscribers(analystId: string): Promise<SubscriberRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("subscriber_id, started_at, renews_at, status, subscriber:profiles!subscriptions_subscriber_id_fkey(*)")
    .eq("analyst_id", analystId)
    .eq("status", "active")
    .gt("renews_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1000);
  const rows = (data as unknown as Record<string, unknown>[]) ?? [];
  return rows.map((row) => {
    const sub = row.subscriber;
    const subscriber = Array.isArray(sub) ? sub[0] : sub;
    return { ...row, subscriber } as SubscriberRow;
  });
}
