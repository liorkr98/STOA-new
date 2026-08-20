import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Session helpers, deduplicated per request.
 *
 * A single navigation used to make three separate `getUser()` calls -- one in
 * middleware, one in the layout, one in the page -- each a network round trip to
 * Supabase Auth for the same answer. React's `cache()` memoizes per request, so
 * the layout and the page (and anything else asking) now share one call.
 * Middleware runs in a different context and is handled separately.
 */

const getUserCached = cache(async () => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch {
    return null;
  }
});

/** The signed-in user's profile, or null. Safe to call from any Server Component. */
export const getSessionProfile = cache(async (): Promise<Profile | null> => {
  try {
    const user = await getUserCached();
    if (!user) return null;

    const supabase = await createClient();
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
});

export const getSessionUserId = cache(async (): Promise<string | null> => {
  const user = await getUserCached();
  return user?.id ?? null;
});
