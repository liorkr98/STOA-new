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

export async function listTopAnalysts(limit = 12): Promise<Profile[]> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "analyst")
      .order("rating", { ascending: false })
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
    .order("rating", { ascending: false })
    .limit(limit);
  return (data as Profile[]) ?? [];
}
