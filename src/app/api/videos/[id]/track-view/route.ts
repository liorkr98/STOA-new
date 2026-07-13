import { NextResponse, type NextRequest } from "next/server";
import { recordVideoViewEvent } from "@/lib/db/video-clips";

/**
 * Video funnel metrics (Part 2.7). Called on view start, completion, and
 * click-through to the linked report. Feeds video_view_events, which feeds the
 * Part 1 decision gate (view -> report open -> conversion). Logged-out views are
 * allowed (viewer_id null); RLS restricts who can read the funnel.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    watchedSeconds?: number;
    completed?: boolean;
    clickedThroughToReport?: boolean;
  };

  const { ok } = await recordVideoViewEvent({
    videoId: id,
    watchedSeconds: typeof body.watchedSeconds === "number" ? Math.max(0, Math.round(body.watchedSeconds)) : undefined,
    completed: body.completed === true,
    clickedThroughToReport: body.clickedThroughToReport === true,
  });

  return NextResponse.json({ ok });
}
