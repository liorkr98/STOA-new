import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  BunnyStreamError,
  createBunnyVideo,
  createPresignedUpload,
  bunnyPlaybackUrl,
  bunnyThumbnailUrl,
  bunnyPreviewUrl,
  MAX_VIDEO_DURATION_SECONDS,
} from "@/lib/video/bunny";
import { createVideoClip } from "@/lib/db/video-clips";

/**
 * Start a direct creator upload (Part 2.3). Analysts only. The video is hard-
 * linked to an existing locked/published report they own (Part 0's rule). Returns
 * a presigned Bunny TUS session so the browser uploads straight to Bunny; the
 * webhook (Part 2.3) flips status to ready.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "analyst" && profile?.role !== "admin") {
    return NextResponse.json({ error: "analysts only" }, { status: 403 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    reportId?: string;
    title?: string;
    durationSeconds?: number;
  };
  if (!body.reportId) {
    return NextResponse.json({ error: "reportId required" }, { status: 400 });
  }

  // Client-side pre-check mirror: reject over-length before we allocate a Bunny
  // object. The webhook re-enforces this once true duration is known.
  if (body.durationSeconds && body.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
    return NextResponse.json(
      { error: `Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.` },
      { status: 400 },
    );
  }

  // Hard link: the report must exist, belong to the analyst, and be locked or
  // published (Part 0 / Part 3.1). No standalone videos.
  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, status, locked_at, title")
    .eq("id", body.reportId)
    .maybeSingle();
  if (!report || report.author_id !== user.id) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }
  const locked =
    report.locked_at != null ||
    report.status === "published" ||
    report.status === "resolution_pending_review";
  if (!locked) {
    return NextResponse.json(
      { error: "Lock or publish the report before attaching a video." },
      { status: 409 },
    );
  }

  try {
    const title = (body.title || report.title || "Stoa video").toString();
    const { guid } = await createBunnyVideo(title);
    const clip = await createVideoClip({
      reportId: report.id,
      bunnyGuid: guid,
      playbackUrl: bunnyPlaybackUrl(guid),
      thumbnailUrl: bunnyThumbnailUrl(guid),
      previewUrl: bunnyPreviewUrl(guid),
    });
    if (!clip) return NextResponse.json({ error: "could not create clip" }, { status: 500 });

    const upload = createPresignedUpload(guid);
    return NextResponse.json({ clipId: clip.id, guid, upload, maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS });
  } catch (err) {
    const status = err instanceof BunnyStreamError ? err.status : 502;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "video provider unavailable" },
      { status },
    );
  }
}
