import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gradeDuePredictions } from "@/lib/engine/grade";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Scheduled grading endpoint. Protected by CRON_SECRET. Vercel Cron calls this
 * with an Authorization: Bearer <CRON_SECRET> header (see vercel.json).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const db = createAdminClient();
    const summary = await gradeDuePredictions(db);

    if (process.env.CRON_ALERT_WEBHOOK_URL) {
      // Fire-and-forget success ping (optional monitoring §8).
      fetch(process.env.CRON_ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "grade.ok", summary, at: new Date().toISOString() }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    const message = e instanceof Error ? e.message : "grading failed";

    if (process.env.CRON_ALERT_WEBHOOK_URL) {
      fetch(process.env.CRON_ALERT_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "grade.failed", error: message, at: new Date().toISOString() }),
      }).catch(() => {});
    }

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
