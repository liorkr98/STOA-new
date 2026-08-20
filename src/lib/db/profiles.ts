import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import type { Profile } from "@/lib/types";

export const getProfileByHandle = cache(async (handle: string): Promise<Profile | null> => {
  const supabase = createPublicClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("handle", handle)
    .maybeSingle();
  return (data as Profile) ?? null;
});

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = createPublicClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  return (data as Profile) ?? null;
}

export async function getProfilesByIds(ids: string[]): Promise<Profile[]> {
  if (!ids.length) return [];
  const supabase = createPublicClient();
  const { data } = await supabase.from("profiles").select("*").in("id", ids);
  const map = new Map(((data as Profile[]) ?? []).map((p) => [p.id, p]));
  return ids.map((id) => map.get(id)).filter(Boolean) as Profile[];
}

export async function listTopAnalysts(limit = 12): Promise<Profile[]> {
  try {
    return await cachedPage(`analysts:top:${limit}`, 60, async () => {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "analyst")
        .order("score", { ascending: false })
        .limit(limit);
      return (data as Profile[]) ?? [];
    });
  } catch {
    return [];
  }
}

/** Analysts by accumulated audience (followers), the POPULAR pool. Never by score. */
export async function listAnalystsByFollowers(limit = 24): Promise<Profile[]> {
  try {
    return await cachedPage(`analysts:followers:${limit}`, 60, async () => {
      const supabase = createPublicClient();
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "analyst")
        .order("followers_count", { ascending: false })
        .limit(limit);
      return (data as Profile[]) ?? [];
    });
  } catch {
    return [];
  }
}

export async function searchProfiles(query: string, limit = 8): Promise<Profile[]> {
  const supabase = createPublicClient();
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
