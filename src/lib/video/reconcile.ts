import "server-only";

import {
  getBunnyVideo,
  deleteBunnyVideo,
  bunnyPlaybackUrl,
  bunnyThumbnailUrl,
  bunnyPreviewUrl,
  bunnyCaptionVttUrl,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/video/bunny";
import {
  markVideoClipReadyByGuid,
  markClipLiveByGuid,
  listUnsettledClips,
} from "@/lib/db/video-clips";
import { enqueueOrRun } from "@/lib/jobs/client";
import { processReadyVideo } from "@/lib/video/process";

export type ReconcileOutcome = "ready" | "processing" | "failed" | "unreachable";

/**
 * Bring one clip's row in line with Bunny's authoritative state, and stamp
 * `published_at` when it lands ready under an already-published report.
 *
 * The Bunny webhook is the intended trigger for this, but delivery is not
 * guaranteed (and is currently not arriving at all), so the same logic is
 * reachable from the publication page, which reconciles on view and is what
 * actually promotes clips today, and from a daily cron behind it. Idempotent:
 * re-running on a settled clip is a no-op.
 *
 * Bunny video.status: 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding,
 * 4 Finished, 5 Error, 6 UploadFailed.
 */
export async function reconcileClip(guid: string): Promise<ReconcileOutcome> {
  let video: Awaited<ReturnType<typeof getBunnyVideo>>;
  try {
    video = await getBunnyVideo(guid);
  } catch {
    return "unreachable";
  }

  const finished = video.status === 4;
  const failed = video.status === 5 || video.status === 6;

  if (finished && video.length > MAX_VIDEO_DURATION_SECONDS) {
    await markVideoClipReadyByGuid(guid, {
      playbackUrl: bunnyPlaybackUrl(guid),
      thumbnailUrl: null,
      previewUrl: null,
      captionVttUrl: null,
      durationSeconds: video.length,
      status: "failed",
    });
    await deleteBunnyVideo(guid);
    return "failed";
  }

  const status = finished ? "ready" : failed ? "failed" : "processing";

  await markVideoClipReadyByGuid(guid, {
    playbackUrl: bunnyPlaybackUrl(guid),
    thumbnailUrl: bunnyThumbnailUrl(guid),
    previewUrl: bunnyPreviewUrl(guid),
    captionVttUrl: bunnyCaptionVttUrl(guid),
    durationSeconds: video.length,
    status,
  });

  if (!finished) return status;

  await markClipLiveByGuid(guid);
  await enqueueOrRun("video-process", { guid }, () => processReadyVideo(guid));
  return "ready";
}

/** Sweep every clip that has not settled yet. Used by the maintenance cron. */
export async function reconcileUnsettledClips(
  limit = 50,
): Promise<{ checked: number; promoted: number; failed: number }> {
  const clips = await listUnsettledClips(limit);
  let promoted = 0;
  let failed = 0;
  for (const clip of clips) {
    const outcome = await reconcileClip(clip.bunny_video_guid);
    if (outcome === "ready") promoted += 1;
    if (outcome === "failed") failed += 1;
  }
  return { checked: clips.length, promoted, failed };
}
