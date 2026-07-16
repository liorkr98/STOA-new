import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { refreshTickerMetrics } from "@/lib/engine/refresh-ticker-metrics";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Refreshes cached last_price / market_cap on all active `tickers` via Yahoo.
 * Scheduled hourly in vercel.json — full universe sweep fits within one run.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await withCronMonitor("refresh-ticker-metrics-cron", async () => {
      const db = createAdminClient();
      const offset = Number(request.nextUrl.searchParams.get("offset") ?? "0");
      return refreshTickerMetrics(db, {
        offset: Number.isFinite(offset) ? offset : 0,
        maxBatches: 120,
      });
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "metrics refresh failed";

    await alertCronResult({ job: "refresh-ticker-metrics", ok: false, error: message });

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
