import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyJobRequest } from "@/lib/jobs/verify";
import { deadLetter } from "@/lib/jobs/dead-letter";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * QStash consumer for notification fan-out. A publish notifies every follower
 * and active subscriber; running that off the request keeps a popular analyst's
 * publish fast. Idempotency is handled inside `notify_publication` (it skips
 * recipients already notified for the report).
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  if (!(await verifyJobRequest(req, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { reportId } = (JSON.parse(rawBody || "{}") as { reportId?: string }) ?? {};
  if (!reportId) return NextResponse.json({ ok: true });

  try {
    const admin = createAdminClient();
    await admin.rpc("notify_publication", { p_report_id: reportId });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await deadLetter("notify", e, { reportId });
    const message = e instanceof Error ? e.message : "notify failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
