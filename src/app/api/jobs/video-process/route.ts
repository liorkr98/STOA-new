import { NextResponse } from "next/server";
import { verifyJobRequest } from "@/lib/jobs/verify";
import { deadLetter } from "@/lib/jobs/dead-letter";
import { processReadyVideo } from "@/lib/video/process";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * QStash consumer for Bunny video post-processing (captions + transcript cache).
 * Retried by QStash on failure; dead-letters to #bugs after exhaustion.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!(await verifyJobRequest(req, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { guid } = (JSON.parse(rawBody || "{}") as { guid?: string }) ?? {};
  if (!guid) return NextResponse.json({ ok: true });

  try {
    await processReadyVideo(guid);
    return NextResponse.json({ ok: true });
  } catch (e) {
    await deadLetter("video-process", e, { guid });
    const message = e instanceof Error ? e.message : "video processing failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
