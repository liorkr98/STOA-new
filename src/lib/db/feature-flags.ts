import { createClient } from "@/lib/supabase/server";

/**
 * Feature-flag reads (Part 1). Reversible, measured rollout. An env override
 * (NEXT_PUBLIC_<KEY> = "1") short-circuits the DB read so preview deploys can
 * flip a flag without a migration. Fails soft to `false`.
 */

export type FeatureFlagKey = "video_first_discover";

function envOverride(key: FeatureFlagKey): boolean | null {
  const raw = process.env[`NEXT_PUBLIC_${key.toUpperCase()}`];
  if (raw == null) return null;
  return raw === "1" || raw.toLowerCase() === "true";
}

export async function isFeatureEnabled(key: FeatureFlagKey): Promise<boolean> {
  const override = envOverride(key);
  if (override !== null) return override;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", key)
      .maybeSingle();
    if (error || !data) return false;
    return Boolean(data.enabled);
  } catch {
    return false;
  }
}

/**
 * The video-first Feed is the product direction and is on by default. The
 * database row no longer gates it; `NEXT_PUBLIC_VIDEO_FIRST_DISCOVER=0` in
 * the environment turns it off wholesale for a rollback, and `?layout=text`
 * reaches the legacy mosaic per visit.
 */
export async function isVideoFirstDiscover(): Promise<boolean> {
  const override = envOverride("video_first_discover");
  if (override !== null) return override;
  return true;
}
