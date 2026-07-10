import "server-only";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

/** OpenAI Audio API — speech synthesis (DeepSeek has no TTS). */
export function ttsApiKey(): string | undefined {
  const raw = process.env.OPENAI_API_KEY;
  if (!raw) return undefined;
  return raw.replace(/[\x00-\x1f\x7f]/g, "").trim() || undefined;
}

export function hasTtsProvider(): boolean {
  return Boolean(ttsApiKey());
}

/**
 * Synthesize MP3 speech. Model `tts-1` costs ~$15 per 1M characters
 * (~$0.01–0.02 per 60s brief). Charged to platform via OPENAI_API_KEY.
 */
export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const key = ttsApiKey();
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
      voice: process.env.OPENAI_TTS_VOICE?.trim() || "nova",
      response_format: "mp3",
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`TTS failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const buf = await res.arrayBuffer();
  return Buffer.from(buf);
}
