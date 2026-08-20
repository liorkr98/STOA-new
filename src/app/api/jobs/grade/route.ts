import { NextResponse } from "next/server";
import { verifyJobRequest } from "@/lib/jobs/verify";
import { deadLetter } from "@/lib/jobs/dead-letter";
import { runGradeAndRefresh } from "@/lib/engine/run-grade";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * QStash consumer for the grading/resolution run. Returning non-2xx makes QStash
 * retry with backoff; after retries are exhausted the failure has already been
 * dead-lettered to #bugs. Safe to retry (row-level idempotent grading).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!(await verifyJobRequest(req, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runGradeAndRefresh();
    await alertCronResult({ job: "grade", ok: true, summary });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    await deadLetter("grade", e);
    const message = e instanceof Error ? e.message : "grading failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
