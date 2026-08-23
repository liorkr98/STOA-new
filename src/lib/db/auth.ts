import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Session helpers, deduplicated per request.
 *
 * Middleware already refreshed a near-expiry token. Layouts and pages only
 * need the user id from the cookie, so they read `getSession()` (local JWT)
 * rather than calling `getUser()` again. React's `cache()` memoizes per
 * request, so the layout and the page share that one read.
 *
 * Signed-out visitors have no `sb-` cookie. Calling `getUser()` anyway was a
 * 200-400ms Auth round trip (Vercel iad1 to Supabase Singapore) on every
 * landing, Markets, and dispatch render. Skip it when there is nothing to
 * refresh, matching middleware.
 */

const getUserCached = cache(async () => {
  try {
    const store = await cookies();
    if (!store.getAll().some((c) => c.name.startsWith("sb-"))) return null;

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user ?? null;
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
