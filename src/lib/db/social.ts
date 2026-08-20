import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function isFollowing(followerId: string, analystId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("analyst_id", analystId)
    .maybeSingle();
  return Boolean(data);
}

export async function isSubscribed(subscriberId: string, analystId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("subscriber_id", subscriberId)
    .eq("analyst_id", analystId)
    .eq("status", "active")
    .gt("renews_at", new Date().toISOString())
    .maybeSingle();
  return Boolean(data);
}

export async function hasUnlocked(userId: string, reportId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("report_unlocks")
    .select("report_id")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .maybeSingle();
  return Boolean(data);
}

export async function hasLiked(userId: string, reportId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("likes")
    .select("report_id")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .maybeSingle();
  return Boolean(data);
}

export async function hasSaved(userId: string, reportId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("saved_reports")
    .select("report_id")
    .eq("user_id", userId)
    .eq("report_id", reportId)
    .maybeSingle();
  return Boolean(data);
}

export async function followedAnalystIds(followerId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select("analyst_id")
    .eq("follower_id", followerId);
  return ((data as { analyst_id: string }[]) ?? []).map((r) => r.analyst_id);
}

/** Full profiles of the analysts the user follows (for the Following page). */
export async function listFollowedAnalysts(followerId: string): Promise<Profile[]> {
  const ids = await followedAnalystIds(followerId);
  if (ids.length === 0) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  return (data as Profile[]) ?? [];
}

export async function subscriberCount(analystId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("analyst_id", analystId)
    .eq("status", "active");
  return count ?? 0;
}

export async function subscribedAnalystIds(subscriberId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("analyst_id")
    .eq("subscriber_id", subscriberId)
    .eq("status", "active");
  return ((data as { analyst_id: string }[]) ?? []).map((r) => r.analyst_id);
}
