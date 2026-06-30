import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/** The signed-in user's profile, or null. Safe to call from any Server Component. */
export async function getSessionProfile(): Promise<Profile | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
    if (data) return data as Profile;

    // Auth OK but no profile row — usually means DB migrations/triggers weren't run yet.
    const handle = (user.email?.split("@")[0] ?? "user").replace(/[^a-z0-9_]/gi, "_").toLowerCase();
    return {
      id: user.id,
      handle,
      display_name: (user.user_metadata?.display_name as string) ?? handle,
      role: "user",
      avatar_url: null,
      cover_url: null,
      bio: null,
      headline: null,
      score: 0,
      rating: 600,
      tier: "unranked",
      followers_count: 0,
      sub_price: null,
      report_price: null,
      verified: false,
      created_at: user.created_at,
    };
  } catch {
    return null;
  }
}

export async function getSessionUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}
