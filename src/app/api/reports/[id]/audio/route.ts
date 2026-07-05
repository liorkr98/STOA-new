import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadReport } from "@/lib/access/can-read";
import { spendAiCredits } from "@/lib/ai/spend";

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
 * POST: author-only generation. Builds a ~60s bottom-line script (thesis,
 * call, horizon, disclosure) from the report + prediction, synthesizes it via
 * OpenAI TTS (credit-metered), and stores the mp3 server-side.
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
    .select("id, author_id, title, summary, ticker, predictions(direction, target_price, horizon_days)")
    .eq("id", id)
    .maybeSingle();
  if (!report) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (report.author_id !== user.id) {
    return NextResponse.json({ error: "authors only" }, { status: 403 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured" }, { status: 502 });
  }

  const spend = await spendAiCredits("audioBrief", "Audio brief");
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  const prediction = Array.isArray(report.predictions)
    ? (report.predictions[0] as { direction?: string; target_price?: number; horizon_days?: number } | undefined)
    : (report.predictions as { direction?: string; target_price?: number; horizon_days?: number } | null);

  const parts: string[] = [];
  if (report.title) parts.push(`${report.title}.`);
  if (report.summary) parts.push(report.summary);
  if (report.ticker && prediction?.direction) {
    const target =
      prediction.target_price != null ? `, target ${prediction.target_price} dollars` : "";
    const horizon =
      prediction.horizon_days != null ? ` within ${prediction.horizon_days} days` : "";
    parts.push(`The call: ${prediction.direction} on ${report.ticker}${target}${horizon}.`);
  }
  parts.push("This call is locked on the record. Analyst research, not investment advice.");
  const script = parts.join(" ").slice(0, 3800);

  let audio: ArrayBuffer;
  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "tts-1", voice: "onyx", input: script, response_format: "mp3" }),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
      return NextResponse.json(
        { error: err?.error?.message ?? "TTS failed" },
        { status: 502 },
      );
    }
    audio = await res.arrayBuffer();
  } catch {
    return NextResponse.json({ error: "TTS unavailable" }, { status: 502 });
  }

  const admin = createAdminClient();
  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(audioPath(id), Buffer.from(audio), { contentType: "audio/mpeg", upsert: true });
  if (upErr) return NextResponse.json({ error: "storage failed" }, { status: 500 });

  return NextResponse.json({ ok: true, credits_remaining: spend.remaining });
}
