import { NextResponse } from "next/server";
import { getVideoClip } from "@/lib/db/video-clips";
import { settleClipOrRetry } from "@/lib/video/reconcile";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";

/**
 * Called once the browser has finished the TUS upload to Bunny. Starts the
 * settle-or-retry chain immediately so a finished encode is promoted in
 * seconds even when the Bunny webhook never arrives.
 */
export const POST = withHandler<{ id: string }>(
  {
    route: "POST /api/creator/videos/[id]/uploaded",
    auth: "required",
    idempotency: { scope: "video-uploaded" },
    rateLimit: { name: "video-uploaded", limit: 30, windowSeconds: 60, by: "user" },
  },
  async ({ user, params }) => {
    const clip = await getVideoClip(params.id);
    if (!clip || clip.creator_id !== user!.id) {
      throw new ApiError("not_found", "not found");
    }

    const outcome = await settleClipOrRetry(clip.bunny_video_guid, 0);
    return NextResponse.json({ ok: true, outcome });
  },
);
