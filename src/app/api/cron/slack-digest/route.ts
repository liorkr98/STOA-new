import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/auth";
import { withCronMonitor } from "@/lib/cron/sentry-monitor";
import { sendDailyDigests } from "@/lib/slack/digest";
import { alertCronResult } from "@/lib/slack/alerts";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Posts daily #revenue and #marketing digests from the alert queue. */
export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await withCronMonitor("slack-digest-cron", async () => sendDailyDigests());

    await alertCronResult({ job: "slack-digest", ok: true, summary });

    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "slack digest failed";
    await alertCronResult({ job: "slack-digest", ok: false, error: message });
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
