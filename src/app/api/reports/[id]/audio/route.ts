import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { canReadReport } from "@/lib/access/can-read";
import { spendAiCredits } from "@/lib/ai/spend";
import { buildAudioBriefScript, bodyPlainText } from "@/lib/ai/audio-brief-script";
import type { AudioBriefMode } from "@/lib/ai/audio/pricing";
import {
  creditsForScriptChars,
  estimateMinutes,
  quoteAudioBrief,
} from "@/lib/ai/audio/pricing";
import { DEFAULT_AUDIO_VOICE_ID, getAudioVoice, isValidAudioVoiceId } from "@/lib/ai/audio/voices";
import { activeTtsProvider, hasTtsProvider, synthesizeSpeech } from "@/lib/ai/tts";
import {
  audioStoragePath,
  getCachedAudioBrief,
  listCachedAudioBriefs,
  mintAudioSignedUrl,
  saveCachedAudioBrief,
} from "@/lib/db/report-audio";

const BUCKET = "report-audio";
const SIGNED_TTL_S = 60 * 60;

function parseMode(raw: string | null | undefined): AudioBriefMode {
  if (raw === "extended" || raw === "full") return raw;
  return "brief";
}

async function loadReportContext(supabase: Awaited<ReturnType<typeof createClient>>, id: string) {
  const { data: report } = await supabase
    .from("reports")
    .select("id, author_id, title, summary, ticker, content_hash")
    .eq("id", id)
    .maybeSingle();
  if (!report) return null;

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

  return {
    report,
    body: (bodyRow as { body: string | null } | null)?.body ?? null,
    prediction: prediction as {
      direction: string;
      target_price: number | null;
      horizon_date?: string | null;
    } | null,
  };
}

/**
 * GET ?voice=pro — signed playback URL for a cached brief.
 * GET (no voice) — list cached voice ids for this report.
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const allowed = await canReadReport(id);
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  const url = new URL(req.url);
  const voiceParam = url.searchParams.get("voice");

  if (!voiceParam) {
    const cached = await listCachedAudioBriefs(id);
    return NextResponse.json({
      voices: cached.map((c) => ({
        voice_id: c.voice_id,
        mode: c.mode,
        script_chars: c.script_chars,
        duration_estimate_sec: c.duration_estimate_sec,
        credits_charged: c.credits_charged,
      })),
      tts_provider: activeTtsProvider(),
    });
  }

  const voiceId = isValidAudioVoiceId(voiceParam) ? voiceParam : DEFAULT_AUDIO_VOICE_ID;
  const cached = await getCachedAudioBrief(id, voiceId);
  if (!cached) {
    return NextResponse.json({ error: "no audio brief" }, { status: 404 });
  }

  const signedUrl = await mintAudioSignedUrl(cached.storage_path, SIGNED_TTL_S);
  if (!signedUrl) {
    return NextResponse.json({ error: "no audio brief" }, { status: 404 });
  }

  return NextResponse.json({
    url: signedUrl,
    voice_id: cached.voice_id,
    mode: cached.mode,
    script_chars: cached.script_chars,
    duration_estimate_sec: cached.duration_estimate_sec,
    cached: true,
  });
}

/**
 * POST { voice?, mode?, force? }
 * Generates once per report+voice; cached replays are free for all readers.
 * Script via DeepSeek; speech via Voicebox (preferred) or OpenAI TTS fallback.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in required" }, { status: 401 });

  const allowed = await canReadReport(id);
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  if (!hasTtsProvider()) {
    return NextResponse.json(
      {
        error:
          "Audio brief needs VOICEBOX_API_URL (self-hosted Voicebox) or OPENAI_API_KEY. DeepSeek writes the script only.",
      },
      { status: 503 },
    );
  }

  let bodyJson: { voice?: string; mode?: string; force?: boolean } = {};
  try {
    bodyJson = (await req.json()) as typeof bodyJson;
  } catch {
    bodyJson = {};
  }

  const voiceId =
    bodyJson.voice && isValidAudioVoiceId(bodyJson.voice)
      ? bodyJson.voice
      : DEFAULT_AUDIO_VOICE_ID;
  const mode = parseMode(bodyJson.mode);
  const force = Boolean(bodyJson.force);

  const ctxData = await loadReportContext(supabase, id);
  if (!ctxData) return NextResponse.json({ error: "not found" }, { status: 404 });

  const { report, body, prediction } = ctxData;
  const isAuthor = report.author_id === user.id;
  const persona = getAudioVoice(voiceId);
  const contentHash = (report as { content_hash?: string | null }).content_hash ?? null;

  const existing = await getCachedAudioBrief(id, voiceId);
  if (existing && !force) {
    const hashMatch = !contentHash || existing.content_hash === contentHash;
    if (hashMatch) {
      const signedUrl = await mintAudioSignedUrl(existing.storage_path, SIGNED_TTL_S);
      if (signedUrl) {
        return NextResponse.json({
          ok: true,
          cached: true,
          url: signedUrl,
          voice_id: voiceId,
          credits_charged: 0,
          script_chars: existing.script_chars,
          duration_estimate_sec: existing.duration_estimate_sec,
        });
      }
    }
  }

  if (existing && force && !isAuthor) {
    return NextResponse.json({ error: "Only the author can force-regenerate" }, { status: 403 });
  }

  const bodyChars = bodyPlainText(body).length;
  const preQuote = quoteAudioBrief({ bodyPlainChars: bodyChars, mode, cached: false });

  try {
    const script = await buildAudioBriefScript(
      {
        title: report.title,
        summary: report.summary,
        ticker: report.ticker,
        body,
        prediction,
      },
      mode,
    );

    const scriptChars = script.length;
    const credits = creditsForScriptChars(scriptChars);

    const spend = await spendAiCredits(
      "audioBrief",
      `Audio brief (${persona.label}, ${mode}) for ${report.title ?? id}`,
      credits,
    );
    if (spend.error) {
      return NextResponse.json(
        { error: spend.error, have: spend.have, need: spend.need, quote: preQuote },
        { status: spend.error === "insufficient_credits" ? 402 : 400 },
      );
    }

    const { buffer, provider } = await synthesizeSpeech(script, persona);
    const path = audioStoragePath(id, voiceId);
    const admin = createAdminClient();
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: "audio/mpeg", upsert: true });
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const durationSec = estimateMinutes(scriptChars) * 60;
    await saveCachedAudioBrief({
      reportId: id,
      voiceId,
      mode,
      storagePath: path,
      scriptText: script,
      scriptChars,
      contentHash,
      creditsCharged: credits,
      generatedBy: user.id,
      durationEstimateSec: durationSec,
    });

    const signedUrl = await mintAudioSignedUrl(path, SIGNED_TTL_S);

    return NextResponse.json({
      ok: true,
      cached: false,
      url: signedUrl,
      voice_id: voiceId,
      mode,
      provider,
      credits_charged: credits,
      credits_remaining: spend.remaining,
      script_chars: scriptChars,
      duration_estimate_sec: durationSec,
      quote: quoteAudioBrief({ bodyPlainChars: bodyChars, mode, cached: false }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
