import "server-only";
import type { AudioVoicePersona } from "@/lib/ai/audio/voices";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

export function openaiTtsApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY;
  if (!raw) return undefined;
  return raw.replace(/[\x00-\x1f\x7f]/g, "").trim() || undefined;
}

export function hasOpenAiTtsProvider(): boolean {
  return Boolean(openaiTtsApiKey());
}

/** Synthesize MP3 via OpenAI Audio API (~$15 / 1M chars). */
export async function synthesizeWithOpenAi(
  text: string,
  persona: AudioVoicePersona,
): Promise<Buffer> {
  const key = openaiTtsApiKey();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const res = await fetch(OPENAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_TTS_MODEL?.trim() || "tts-1",
      input: text.slice(0, 4096),
      voice: persona.openaiVoice,
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS failed (${res.status}): ${err.slice(0, 200)}`);
  }

  return Buffer.from(await res.arrayBuffer());
}
