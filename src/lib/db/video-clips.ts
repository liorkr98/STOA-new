import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Prediction, Report } from "@/lib/types";

/**
 * video_clips + video_view_events data layer (video-first Discover). The only
 * place these tables are read/written. RLS: creator manages own rows; published
 * + ready rows are publicly readable (the teaser is public by design). The
 * paywalled depth stays behind the linked report, unchanged.
 */

export type VideoClipStatus = "processing" | "ready" | "failed";

export interface VideoClip {
  id: string;
  report_id: string;
  creator_id: string;
  bunny_video_guid: string;
  playback_url: string;
  thumbnail_url: string | null;
  preview_url: string | null;
  caption_vtt_url: string | null;
  transcript: string | null;
  duration_seconds: number;
  status: VideoClipStatus;
  fact_check_results: Record<string, unknown> | null;
  created_at: string;
  published_at: string | null;
}

/** A published clip joined to its report (with author + prediction) for feed cards. */
export interface VideoClipCard extends VideoClip {
  report: Report | null;
}

const COLUMNS =
  "id, report_id, creator_id, bunny_video_guid, playback_url, thumbnail_url, preview_url, caption_vtt_url, transcript, duration_seconds, status, fact_check_results, created_at, published_at";

const CARD_SELECT = `${COLUMNS}, report:reports!video_clips_report_id_fkey(*, author:profiles!reports_author_id_fkey(*), prediction:predictions(*))`;

function normalizeCard(row: Record<string, unknown>): VideoClipCard {
  const rawReport = row.report as Record<string, unknown> | null;
  let report: Report | null = null;
  if (rawReport) {
    const rawPred = Array.isArray(rawReport.prediction)
      ? (rawReport.prediction[0] ?? null)
      : (rawReport.prediction ?? null);
    report = { ...(rawReport as unknown as Report), prediction: (rawPred ?? null) as Prediction | null };
  }
  return { ...(row as unknown as VideoClip), report };
}

export async function createVideoClip(input: {
  reportId: string;
  bunnyGuid: string;
  playbackUrl: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
}): Promise<VideoClip | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("video_clips")
    .insert({
      report_id: input.reportId,
      creator_id: user.id,
      bunny_video_guid: input.bunnyGuid,
      playback_url: input.playbackUrl,
      thumbnail_url: input.thumbnailUrl ?? null,
      preview_url: input.previewUrl ?? null,
      status: "processing",
    })
    .select(COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return data as VideoClip;
}

export async function getVideoClip(id: string): Promise<VideoClip | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_clips").select(COLUMNS).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as VideoClip;
}

export async function getVideoClipCard(id: string): Promise<VideoClipCard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("video_clips").select(CARD_SELECT).eq("id", id).maybeSingle();
  if (error || !data) return null;
  return normalizeCard(data as Record<string, unknown>);
}

export async function listVideosByReport(reportId: string): Promise<VideoClip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_clips")
    .select(COLUMNS)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as VideoClip[];
}

/** Every published, ready clip by one creator, newest first (profile shelves). */
export async function listReadyClipsByCreator(creatorId: string): Promise<VideoClip[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_clips")
    .select(COLUMNS)
    .eq("creator_id", creatorId)
    .eq("status", "ready")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false });
  if (error || !data) return [];
  return data as VideoClip[];
}

/** Published, ready clips for the video-first Discover grid. */
export async function listVideoClipCards(limit = 36): Promise<VideoClipCard[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("video_clips")
    .select(CARD_SELECT)
    .eq("status", "ready")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[])
    .map(normalizeCard)
    .filter((c) => c.report && c.report.status === "published");
}

/** Webhook path: mark a clip ready with Bunny CDN URLs + duration. Service-role. */
export async function markVideoClipReadyByGuid(
  guid: string,
  fields: {
    playbackUrl: string;
    thumbnailUrl: string | null;
    previewUrl: string | null;
    captionVttUrl: string | null;
    durationSeconds: number;
    status: VideoClipStatus;
  },
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("video_clips")
    .update({
      playback_url: fields.playbackUrl,
      thumbnail_url: fields.thumbnailUrl,
      preview_url: fields.previewUrl,
      caption_vtt_url: fields.captionVttUrl,
      duration_seconds: Math.round(fields.durationSeconds),
      status: fields.status,
    })
    .eq("bunny_video_guid", guid);
}

export async function setVideoClipTranscriptByGuid(guid: string, transcript: string): Promise<void> {
  const admin = createAdminClient();
  await admin.from("video_clips").update({ transcript }).eq("bunny_video_guid", guid);
}

/** Creator publish path: attach fact-check + transcript, flip published_at. */
export async function publishVideoClip(
  id: string,
  fields: { transcript: string; factCheck: Record<string, unknown> },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sign in required" };

  const { error } = await supabase
    .from("video_clips")
    .update({
      transcript: fields.transcript,
      fact_check_results: fields.factCheck,
      published_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("creator_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteVideoClip(id: string): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "sign in required" };
  const { error } = await supabase.from("video_clips").delete().eq("id", id).eq("creator_id", user.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Metrics (Part 2.7). Anonymous inserts allowed; RLS restricts reads. */
export async function recordVideoViewEvent(input: {
  videoId: string;
  watchedSeconds?: number;
  completed?: boolean;
  clickedThroughToReport?: boolean;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("video_view_events").insert({
    video_id: input.videoId,
    viewer_id: user?.id ?? null,
    watched_seconds: input.watchedSeconds ?? null,
    completed: input.completed ?? false,
    clicked_through_to_report: input.clickedThroughToReport ?? false,
  });
  return { ok: !error };
}
