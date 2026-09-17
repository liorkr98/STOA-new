import { NextResponse } from "next/server";
import { verifyJobRequest } from "@/lib/jobs/verify";
import { deadLetter } from "@/lib/jobs/dead-letter";
import { settleClipOrRetry } from "@/lib/video/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * QStash consumer for clip follow-ups. After upload (and on a non-finished
 * webhook) we poll Bunny on a delay so a finished clip goes live without
 * waiting for a webhook that may never arrive, or for the daily cron. The
 * chain runs for a little over two hours so a slow encode is not abandoned.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!(await verifyJobRequest(req, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (JSON.parse(rawBody || "{}") as {
    guid?: string;
    attempt?: number;
    expectBytes?: boolean;
  }) ?? {};
  const guid = payload.guid;
  if (!guid) return NextResponse.json({ ok: true });
  const attempt = typeof payload.attempt === "number" && payload.attempt >= 0 ? payload.attempt : 0;

  try {
    const outcome = await settleClipOrRetry(guid, attempt, {
      expectBytes: payload.expectBytes === true,
    });
    return NextResponse.json({ ok: true, outcome });
  } catch (e) {
    await deadLetter("video-reconcile", e, { guid, attempt });
    const message = e instanceof Error ? e.message : "video reconcile failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
