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
    return NextResponse.json({ ok: true, ...summary });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "grading failed" },
      { status: 500 },
    );
  }
}
