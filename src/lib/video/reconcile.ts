import "server-only";

import * as Sentry from "@sentry/nextjs";
import {
  getBunnyVideo,
  deleteBunnyVideo,
  bunnyPlaybackUrl,
  bunnyThumbnailUrl,
  bunnyPreviewUrl,
  bunnyCaptionVttUrl,
  isAbandonedUpload,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/video/bunny";
import {
  markVideoClipReadyByGuid,
  markClipLiveByGuid,
  listUnsettledClips,
} from "@/lib/db/video-clips";
import { enqueueOrRun } from "@/lib/jobs/client";
import { clipDurationSeconds } from "@/lib/video/clip-duration";
import { processReadyVideo } from "@/lib/video/process";
import {
  EMPTY_UPLOAD_GIVE_UP_ATTEMPT,
  nextClipReconcileDelaySeconds,
} from "@/lib/video/follow-up";

export type ReconcileOutcome = "ready" | "processing" | "failed" | "unreachable";

/**
 * Bring one clip's row in line with Bunny's authoritative state, and stamp
 * `published_at` when it lands ready under an already-published report.
 *
 * The Bunny webhook is the intended trigger for this, but delivery is not
 * guaranteed (and is currently not arriving at all), so the same logic is
 * reachable from the post-upload follow-up (`settleClipOrRetry`), the
 * publication page poll, and a daily cron behind them. Idempotent:
 * re-running on a settled clip is a no-op.
 *
 * Bunny video.status: 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding,
 * 4 Finished, 5 Error, 6 UploadFailed. A status 0 still holding no bytes once
 * the upload window has passed is an upload that never arrived, and settles as
 * failed rather than claiming to be processing forever.
 */
export async function reconcileClip(
  guid: string,
  opts: { process?: boolean } = {},
): Promise<ReconcileOutcome> {
  let video: Awaited<ReturnType<typeof getBunnyVideo>>;
  try {
    video = await getBunnyVideo(guid);
  } catch (err) {
    Sentry.captureException(err, { extra: { guid, where: "reconcileClip" } });
    return "unreachable";
  }

  const durationSeconds = clipDurationSeconds(video.length);
  const finished = video.status === 4;
  const failed = video.status === 5 || video.status === 6 || isAbandonedUpload(video);

  if (finished && durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    await markVideoClipReadyByGuid(guid, {
      playbackUrl: bunnyPlaybackUrl(guid),
      thumbnailUrl: null,
      previewUrl: null,
      captionVttUrl: null,
      durationSeconds,
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
    durationSeconds,
    status,
  });

  if (!finished) return status;

  await markClipLiveByGuid(guid);
  // Captions/transcript are optional enrichment. The publication page used
  // to await them; a Bunny failure there crashed the Server Component and
  // production React reported only minified error #441.
  try {
    await enqueueOrRun("video-process", { guid }, () => processReadyVideo(guid), {
      deduplicationId: `video-process-${guid}`,
      runInline: opts.process !== false,
    });
  } catch {
    // Clip is already live; captions retry on the webhook or cron.
  }
  return "ready";
}

/**
 * Reconcile once, and if Bunny is still encoding or unreachable, queue the
 * next look. The webhook is supposed to do this, but it is not arriving, and
 * the Vercel Hobby cron cannot run more than once a day. Follow-ups cover a
 * little over ten minutes so a finished clip goes live in seconds, not hours.
 *
 * Never throws: page renders and poll routes call this and must not 441.
 */
export async function settleClipOrRetry(
  guid: string,
  attempt: number,
  opts: { process?: boolean; expectBytes?: boolean } = {},
): Promise<ReconcileOutcome> {
  let outcome: ReconcileOutcome;
  try {
    outcome = await reconcileClip(guid, opts);
  } catch (err) {
    Sentry.captureException(err, { extra: { guid, attempt, where: "settleClipOrRetry" } });
    outcome = "unreachable";
  }

  if (outcome === "ready" || outcome === "failed") return outcome;

  if (opts.expectBytes && outcome === "processing") {
    try {
      const video = await getBunnyVideo(guid);
      const empty = video.status === 0 && (video.storageSize ?? 0) === 0;
      if (empty && attempt >= EMPTY_UPLOAD_GIVE_UP_ATTEMPT) {
        await markVideoClipReadyByGuid(guid, {
          playbackUrl: bunnyPlaybackUrl(guid),
          thumbnailUrl: null,
          previewUrl: null,
          captionVttUrl: null,
          durationSeconds: 0,
          status: "failed",
        });
        await deleteBunnyVideo(guid);
        return "failed";
      }
    } catch (err) {
      Sentry.captureException(err, { extra: { guid, attempt, where: "settleClipOrRetry.expectBytes" } });
    }
  }

  if (outcome === "unreachable") {
    Sentry.captureMessage("Bunny unreachable while settling clip", {
      level: "warning",
      extra: { guid, attempt },
    });
  }

  const delaySeconds = nextClipReconcileDelaySeconds(attempt);
  if (delaySeconds == null) return outcome;

  try {
    await enqueueOrRun(
      "video-reconcile",
      { guid, attempt: attempt + 1, expectBytes: Boolean(opts.expectBytes) },
      () => settleClipOrRetry(guid, attempt + 1, opts),
      {
        delaySeconds,
        runInline: false,
        deduplicationId: `video-reconcile-${guid}-${attempt + 1}`,
      },
    );
  } catch (err) {
    Sentry.captureException(err, { extra: { guid, attempt, where: "settleClipOrRetry.enqueue" } });
  }

  return outcome;
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
