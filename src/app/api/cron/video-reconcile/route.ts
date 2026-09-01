import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { alertCronResult } from "@/lib/slack/alerts";
import { reconcileUnsettledClips } from "@/lib/video/reconcile";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily backstop for clips Bunny finished without a webhook reaching us.
 *
 * Deliberately daily: a sub-daily schedule is rejected at config validation on
 * this Vercel plan and fails the whole deployment. That makes this the slow
 * safety net, not the working path. The working path is the publication page,
 * which reconciles on view (`getLiveClipForReport`), so a creator opening their
 * own publication promotes a finished clip immediately. Registering the Bunny
 * webhook makes both redundant. Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await withCronMonitor("video-reconcile-cron", () => reconcileUnsettledClips());
    if (summary.promoted > 0 || summary.failed > 0) {
      await alertCronResult({ job: "video-reconcile", ok: true, summary });
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "video reconcile failed";
    await alertCronResult({ job: "video-reconcile", ok: false, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
