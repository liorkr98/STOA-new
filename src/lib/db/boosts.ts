import { createClient } from "@/lib/supabase/server";

export interface ProfileBoost {
  id: string;
  creator_id: string;
  placement: string;
  target_type: "profile" | "report";
  target_id: string | null;
  status: string;
  starts_at: string;
  ends_at: string;
  spend_amount: number;
}

export async function listActiveBoosts(creatorId: string): Promise<ProfileBoost[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_boosts")
    .select("*")
    .eq("creator_id", creatorId)
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .order("ends_at", { ascending: true });
  return (data as ProfileBoost[]) ?? [];
}

export async function listBoostedProfileIds(placement: string, limit = 3): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_boosts")
    .select("creator_id")
    .eq("placement", placement)
    .eq("target_type", "profile")
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(limit);
  return [...new Set((data ?? []).map((r) => r.creator_id as string))];
}

export async function listBoostedReportIds(placement: string, limit = 2): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profile_boosts")
    .select("target_id")
    .eq("placement", placement)
    .eq("target_type", "report")
    .eq("status", "active")
    .gt("ends_at", new Date().toISOString())
    .not("target_id", "is", null)
    .order("starts_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => r.target_id as string);
}
