import { NextResponse } from "next/server";
import {
  getBunnyVideo,
  deleteBunnyVideo,
  bunnyPlaybackUrl,
  bunnyThumbnailUrl,
  bunnyPreviewUrl,
  bunnyCaptionVttUrl,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/video/bunny";
import { markVideoClipReadyByGuid } from "@/lib/db/video-clips";
import { claimWebhookEvent } from "@/lib/webhooks/idempotency";
import { enqueueOrRun } from "@/lib/jobs/client";
import { processReadyVideo } from "@/lib/video/process";

/**
 * Bunny Stream webhook (Part 2.3). Bunny does not sign webhooks, so the URL is
 * protected by a shared secret query param. Fetches the authoritative video
 * record from Bunny (status + true length), enforces the 90s cap server-side
 * (Part 2.3), requests AI captions (Part 2.4), and flips the clip to ready.
 *
 * Bunny video.status: 0 Created, 1 Uploaded, 2 Processing, 3 Transcoding,
 * 4 Finished, 5 Error, 6 UploadFailed.
 */
export async function POST(req: Request) {
  const secret = process.env.BUNNY_STREAM_WEBHOOK_SECRET;
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get("secret") !== secret) {
      return NextResponse.json({ error: "bad secret" }, { status: 401 });
    }
  }

  const event = (await req.json().catch(() => ({}))) as {
    VideoGuid?: string;
    VideoLibraryId?: number;
    Status?: number;
    guid?: string;
  };
  const guid = event.VideoGuid ?? event.guid;
  if (!guid) return NextResponse.json({ ok: true });

  let video: Awaited<ReturnType<typeof getBunnyVideo>>;
  try {
    video = await getBunnyVideo(guid);
  } catch {
    // Transient Bunny error; let Bunny re-deliver.
    return NextResponse.json({ ok: true });
  }

  const finished = video.status === 4;
  const failed = video.status === 5 || video.status === 6;

  // Idempotency: Bunny has no event id, so dedupe on the status transition.
  // A re-delivered "finished" webhook must not re-enqueue processing twice.
  const isNew = await claimWebhookEvent("bunny", `${guid}:${video.status}`).catch(() => true);
  if (!isNew) return NextResponse.json({ ok: true, duplicate: true });

  // Enforce the teaser-length cap once true duration is known. Over-length
  // uploads are rejected here, not just in the UI (Part 2.3).
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
    return NextResponse.json({ ok: true });
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

  if (finished) {
    // Captions are mandatory before publish (Part 2.4). Hand post-processing to
    // the video-process queue (retries + dead-letter); runs inline when QStash
    // is not configured so behaviour is unchanged without it.
    await enqueueOrRun("video-process", { guid }, () => processReadyVideo(guid));
  }

  return NextResponse.json({ ok: true });
}
