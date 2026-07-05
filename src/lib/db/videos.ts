import { createClient } from "@/lib/supabase/server";

/**
 * video_assets data layer (Part D). The only place video rows are read/written.
 * RLS: creator manages own rows; rows linked to a published report are readable
 * (actual playback stays gated by the signed-token route).
 */

export interface VideoAsset {
  id: string;
  creator_id: string;
  report_id: string | null;
  provider: string;
  playback_id: string | null;
  poster_url: string | null;
  duration_s: number | null;
  aspect_ratio: string | null;
  status: string;
  created_at: string;
}

const COLUMNS =
  "id, creator_id, report_id, provider, playback_id, poster_url, duration_s, aspect_ratio, status, created_at";

export async function createVideoAsset(input: {
  provider: string;
  playback_id: string;
  report_id?: string | null;
}): Promise<VideoAsset | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("video_assets")
    .insert({
      creator_id: user.id,
      provider: input.provider,
      playback_id: input.playback_id,
      report_id: input.report_id ?? null,
      status: "uploading",
    })
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return data as VideoAsset;
}

export async function getVideoAsset(id: string): Promise<VideoAsset | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_assets")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return data as VideoAsset;
}
