import { NextResponse } from "next/server";
import {
  getBunnyVideo,
  deleteBunnyVideo,
  requestBunnyCaptions,
  bunnyPlaybackUrl,
  bunnyThumbnailUrl,
  bunnyPreviewUrl,
  bunnyCaptionVttUrl,
  fetchTranscriptFromVtt,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/video/bunny";
import {
  markVideoClipReadyByGuid,
  setVideoClipTranscriptByGuid,
} from "@/lib/db/video-clips";

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
    // Captions are mandatory before publish (Part 2.4). Kick off transcription
    // if Bunny has not produced any yet, then cache the transcript for the
    // fact-checker (Part 2.5).
    if (!video.captions || video.captions.length === 0) {
      await requestBunnyCaptions(guid);
    } else {
      const transcript = await fetchTranscriptFromVtt(guid);
      if (transcript) await setVideoClipTranscriptByGuid(guid, transcript);
    }
  }

  return NextResponse.json({ ok: true });
}
