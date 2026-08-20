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
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";

/**
 * Start a direct creator upload (Part 2.3). Analysts only. The video is hard-
 * linked to an existing locked/published report they own (Part 0's rule).
 * Idempotent so a retried upload-init does not allocate a second Bunny object.
 */
export const POST = withHandler(
  {
    route: "POST /api/creator/videos/upload",
    auth: "required",
    idempotency: { scope: "video-upload" },
    rateLimit: { name: "video-upload", limit: 20, windowSeconds: 60, by: "user" },
  },
  async ({ req, user }) => {
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user!.id)
      .maybeSingle();
    if (profile?.role !== "analyst" && profile?.role !== "admin") {
      throw new ApiError("forbidden", "analysts only");
    }

    const body = (await req.json().catch(() => ({}))) as {
      reportId?: string;
      title?: string;
      durationSeconds?: number;
    };
    if (!body.reportId) {
      throw new ApiError("bad_request", "reportId required");
    }

    if (body.durationSeconds && body.durationSeconds > MAX_VIDEO_DURATION_SECONDS) {
      throw new ApiError(
        "bad_request",
        `Videos must be ${MAX_VIDEO_DURATION_SECONDS} seconds or shorter.`,
      );
    }

    const { data: report } = await supabase
      .from("reports")
      .select("id, author_id, status, locked_at, title")
      .eq("id", body.reportId)
      .maybeSingle();
    if (!report || report.author_id !== user!.id) {
      throw new ApiError("not_found", "report not found");
    }
    const locked =
      report.locked_at != null ||
      report.status === "published" ||
      report.status === "resolution_pending_review";
    if (!locked) {
      throw new ApiError("conflict", "Lock or publish the report before attaching a video.");
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
      if (!clip) throw new ApiError("internal", "could not create clip");

      const upload = createPresignedUpload(guid);
      return NextResponse.json({
        clipId: clip.id,
        guid,
        upload,
        maxDurationSeconds: MAX_VIDEO_DURATION_SECONDS,
      });
    } catch (err) {
      if (err instanceof ApiError) throw err;
      if (err instanceof BunnyStreamError) {
        throw new ApiError("upstream_error", err.message);
      }
      throw new ApiError("internal", err instanceof Error ? err.message : "video provider unavailable");
    }
  },
);
