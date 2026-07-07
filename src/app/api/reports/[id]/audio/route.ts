import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadReport } from "@/lib/access/can-read";

const BUCKET = "report-audio";
const SIGNED_TTL_S = 60 * 60;

function audioPath(reportId: string): string {
  return `${reportId}/brief.mp3`;
}

/**
 * GET: gated playback (H4). Runs canReadReport, then mints a short-lived signed
 * URL from the PRIVATE report-audio bucket -- a premium brief is never a public
 * file. 404 when no brief has been generated yet.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const allowed = await canReadReport(id);
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(audioPath(id), SIGNED_TTL_S);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "no audio brief" }, { status: 404 });
  }
  return NextResponse.json({ url: data.signedUrl });
}

/**
 * POST: author-only generation. DeepSeek does not provide speech synthesis;
 * existing briefs remain playable via GET until a TTS provider is wired.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.author_id !== user.id) {
    return NextResponse.json({ error: "authors only" }, { status: 403 });
  }

  return NextResponse.json(
    {
      error:
        "Audio brief generation is temporarily unavailable. DeepSeek provides text models only — speech synthesis requires a separate TTS provider.",
    },
    { status: 503 },
  );
}
