import { NextResponse } from "next/server";
import { recordVideoViewEvent } from "@/lib/db/video-clips";
import { withHandler } from "@/lib/http/handler";

/**
 * Video funnel metrics (Part 2.7). Called on view start, completion, and
 * click-through to the linked report. Logged-out views are allowed (viewer_id
 * null); RLS restricts who can read the funnel. Rate-limited per IP because it
 * is public and high-frequency - a viral video concentrates events fast.
 */
export const POST = withHandler<{ id: string }>(
  {
    route: "POST /api/videos/[id]/track-view",
    auth: "optional",
    rateLimit: { name: "track-view", limit: 120, windowSeconds: 60, by: "ip" },
  },
  async ({ req, params }) => {
    const { id } = params;
    const body = (await req.json().catch(() => ({}))) as {
      watchedSeconds?: number;
      completed?: boolean;
      clickedThroughToReport?: boolean;
      sessionId?: string;
      videoLengthSeconds?: number;
      replayed?: boolean;
      skippedAtSeconds?: number;
      surface?: string;
      positionInFeed?: number;
    };

    const { ok } = await recordVideoViewEvent({
      videoId: id,
      watchedSeconds:
        typeof body.watchedSeconds === "number"
          ? Math.max(0, Math.round(body.watchedSeconds))
          : undefined,
      completed: body.completed === true,
      clickedThroughToReport: body.clickedThroughToReport === true,
      sessionId: typeof body.sessionId === "string" ? body.sessionId : null,
      videoLengthSeconds:
        typeof body.videoLengthSeconds === "number"
          ? Math.max(0, Math.round(body.videoLengthSeconds))
          : undefined,
      replayed: body.replayed === true,
      skippedAtSeconds:
        typeof body.skippedAtSeconds === "number"
          ? Math.max(0, Math.round(body.skippedAtSeconds))
          : null,
      surface: typeof body.surface === "string" ? body.surface : null,
      positionInFeed:
        typeof body.positionInFeed === "number" ? Math.max(0, Math.round(body.positionInFeed)) : null,
    });

    return NextResponse.json({ ok });
  },
);
