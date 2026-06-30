import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export interface Notification {
  id: string;
  recipient_id: string;
  actor_id: string | null;
  kind: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
  actor?: Profile | null;
}

export async function listNotifications(
  userId: string,
  limit = 40,
): Promise<Notification[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*, actor:profiles!notifications_actor_id_fkey(*)")
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Notification[]) ?? [];
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .eq("read", false);
  return count ?? 0;
}
