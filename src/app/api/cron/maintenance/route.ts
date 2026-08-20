import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Monthly database maintenance: ensure next month's partitions exist and purge
 * expired bookkeeping rows (rate-limit windows, processed webhook events, money
 * idempotency keys). Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await withCronMonitor("maintenance-cron", async () => {
      const db = createAdminClient();
      const out: Record<string, unknown> = {};

      await db.rpc("ensure_video_view_partitions");
      out.partitions = "ensured";

      const rl = await db.rpc("cleanup_api_rate_limits");
      out.rate_limits_deleted = rl.data ?? null;

      const wh = await db.rpc("cleanup_processed_webhook_events");
      out.webhook_events_deleted = wh.data ?? null;

      const idem = await db.rpc("cleanup_money_idempotency");
      out.money_idempotency_deleted = idem.data ?? null;

      return out;
    });

    await alertCronResult({ job: "maintenance", ok: true, summary });
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "maintenance failed";
    await alertCronResult({ job: "maintenance", ok: false, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
