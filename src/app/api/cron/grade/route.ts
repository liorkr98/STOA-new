import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeDuePredictions } from "@/lib/engine/grade";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled grading endpoint. Protected by CRON_SECRET. Vercel Cron calls this
 * with an Authorization: Bearer <CRON_SECRET> header (see vercel.json).
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await withCronMonitor("grade-cron", async () => {
      const db = createAdminClient();
      const result = await gradeDuePredictions(db);
      try {
        await db.rpc("refresh_platform_stats");
      } catch {
        // platform_stats MV lands in migration 0019
      }
      return result;
    });

    await alertCronResult({ job: "grade", ok: true, summary });

    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "grading failed";

    await alertCronResult({ job: "grade", ok: false, error: message });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
