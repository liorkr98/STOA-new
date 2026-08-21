import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getProfileByHandle(handle: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (!ids.length) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  const map = new Map(((data as Profile[]) ?? []).map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Profile[];
}

/**
 * Score + specialties only, for percentile ranking against the whole analyst
 * pool. The score page ranked against 500 analysts by pulling 500 full
 * profile rows (every column including the profile_config JSON blob) purely
 * to read two fields.
 */
export async function listAnalystScorePool(
  limit = 500,
): Promise<Pick<Profile, "score" | "profile_config">[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("score, profile_config")
      .eq("role", "analyst")
      .order("score", { ascending: false })
      .limit(limit);
    return (data as Pick<Profile, "score" | "profile_config">[]) ?? [];
  } catch {
    return [];
  }
}

export async function listTopAnalysts(limit = 12): Promise<Profile[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "analyst")
      .order("score", { ascending: false })
      .limit(limit);
    return (data as Profile[]) ?? [];
  } catch {
    return [];
  }
}

export async function searchProfiles(query: string, limit = 8): Promise<Profile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .or(`display_name.ilike.%${query}%,handle.ilike.%${query}%`)
    .order("score", { ascending: false })
    .limit(limit);
  return (data as Profile[]) ?? [];
}

export async function countReferrals(creatorId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("referred_by", creatorId);
    if (error) throw error;
    return count ?? 0;
  } catch {
    return 0;
  }
}
