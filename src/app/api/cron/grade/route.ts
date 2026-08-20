import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { enqueueOrRun } from "@/lib/jobs/client";
import { runGradeAndRefresh } from "@/lib/engine/run-grade";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled grading trigger. Protected by CRON_SECRET. When QStash is configured
 * this enqueues the run (returns immediately, off the 60s cron ceiling, with
 * retry + dead-letter); otherwise it runs inline as before. The consumer that
 * does the work lives at /api/jobs/grade.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const { queued, result } = await enqueueOrRun(
      "grade",
      {},
      () => withCronMonitor("grade-cron", runGradeAndRefresh),
      { deduplicationId: `grade-${new Date().toISOString().slice(0, 13)}` },
    );

    if (queued) {
      return NextResponse.json({ ok: true, queued: true });
    }

    await alertCronResult({ job: "grade", ok: true, summary: result });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "grading failed";
    await alertCronResult({ job: "grade", ok: false, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
