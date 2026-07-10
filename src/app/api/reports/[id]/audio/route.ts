import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadReport } from "@/lib/access/can-read";
import { spendAiCredits } from "@/lib/ai/spend";
import { AI_COST } from "@/lib/ai/credits";
import { buildAudioBriefScript } from "@/lib/ai/audio-brief-script";
import { hasTtsProvider, synthesizeSpeech } from "@/lib/ai/tts";

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
 * POST: author-only generation. Script via DeepSeek (optional); speech via OpenAI TTS.
 * Platform cost ~$0.01–0.02 per brief (tts-1). User charged 3 AI credits.
 */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  if (!hasTtsProvider()) {
    return NextResponse.json(
      {
        error:
          "Audio brief needs OPENAI_API_KEY on Vercel (OpenAI TTS, ~$0.02/brief). DeepSeek handles text only.",
      },
      { status: 503 },
    );
  }

  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, title, summary, ticker")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.author_id !== user.id) {
    return NextResponse.json({ error: "authors only" }, { status: 403 });
  }

  const { data: bodyRow } = await supabase
    .from("report_bodies")
    .select("body")
    .eq("report_id", id)
    .maybeSingle();

  const { data: prediction } = await supabase
    .from("predictions")
    .select("direction, target_price, horizon_date")
    .eq("report_id", id)
    .maybeSingle();

  const spend = await spendAiCredits("audioBrief", `Audio brief for ${report.title ?? id}`);
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  try {
    const script = await buildAudioBriefScript({
      title: report.title,
      summary: report.summary,
      ticker: report.ticker,
      body: (bodyRow as { body: string | null } | null)?.body ?? null,
      prediction: prediction as {
        direction: string;
        target_price: number | null;
        horizon_date?: string | null;
      } | null,
    });

    const mp3 = await synthesizeSpeech(script);
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(audioPath(id), mp3, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      credits_remaining: spend.remaining,
      credits_charged: AI_COST.audioBrief,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
