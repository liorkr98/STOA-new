import { NextResponse } from "next/server";
import { getSessionUserId } from "@/lib/db/auth";
import { dismissFeedReport } from "@/lib/db/feed-dismissals";

export const dynamic = "force-dynamic";

/** Records "Not interested" — excluded from feed queries for this user. */
export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  let body: { report_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const reportId = body.report_id?.trim();
  if (!reportId) {
    return NextResponse.json({ error: "report_id required" }, { status: 400 });
  }

  const result = await dismissFeedReport(userId, reportId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "dismiss failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
