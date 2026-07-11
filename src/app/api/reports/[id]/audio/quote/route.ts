import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { canReadReport } from "@/lib/access/can-read";
import { bodyPlainText } from "@/lib/ai/audio-brief-script";
import type { AudioBriefMode } from "@/lib/ai/audio/pricing";
import { quoteAudioBrief } from "@/lib/ai/audio/pricing";
import { AUDIO_VOICE_PERSONAS, DEFAULT_AUDIO_VOICE_ID, isValidAudioVoiceId } from "@/lib/ai/audio/voices";
import { activeTtsProvider } from "@/lib/ai/tts";
import { getCachedAudioBrief } from "@/lib/db/report-audio";

function parseMode(raw: string | null): AudioBriefMode {
  if (raw === "extended" || raw === "full") return raw;
  return "brief";
}

/** GET ?voice=pro&mode=brief — cost estimate before generation. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const allowed = await canReadReport(id);
  if (!allowed) return NextResponse.json({ error: "locked" }, { status: 403 });

  const url = new URL(req.url);
  const voiceId = url.searchParams.get("voice");
  const mode = parseMode(url.searchParams.get("mode"));
  const resolvedVoice =
    voiceId && isValidAudioVoiceId(voiceId) ? voiceId : DEFAULT_AUDIO_VOICE_ID;

  const supabase = await createClient();
  const { data: bodyRow } = await supabase
    .from("report_bodies")
    .select("body")
    .eq("report_id", id)
    .maybeSingle();

  const bodyChars = bodyPlainText((bodyRow as { body: string | null } | null)?.body ?? null).length;
  const cached = await getCachedAudioBrief(id, resolvedVoice);
  const quote = quoteAudioBrief({ bodyPlainChars: bodyChars, mode, cached: Boolean(cached) });

  const persona = AUDIO_VOICE_PERSONAS.find((v) => v.id === resolvedVoice);

  return NextResponse.json({
    voice_id: resolvedVoice,
    voice_label: persona?.label,
    mode,
    quote,
    cached: Boolean(cached),
    voices: AUDIO_VOICE_PERSONAS.map((v) => ({
      id: v.id,
      label: v.label,
      tagline: v.tagline,
    })),
    tts_provider: activeTtsProvider(),
  });
}
