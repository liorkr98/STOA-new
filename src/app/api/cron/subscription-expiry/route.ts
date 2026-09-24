import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { expireSubscriptions } from "@/lib/cron/subscriptions";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily subscription expiry: an active subscription past its renewal date is
 * marked expired, which ends the paid access it granted. Its own job: it used
 * to ride inside the retired grading run. Daily because this Vercel plan rejects sub-daily
 * schedules. Protected by CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const expired = await withCronMonitor("subscription-expiry-cron", () =>
      expireSubscriptions(createAdminClient()),
    );
    if (expired > 0) {
      await alertCronResult({ job: "subscription-expiry", ok: true, summary: { expired } });
    }
    return NextResponse.json({ ok: true, expired });
  } catch (e) {
    const message = e instanceof Error ? e.message : "subscription expiry failed";
    await alertCronResult({ job: "subscription-expiry", ok: false, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
