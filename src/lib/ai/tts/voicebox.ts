import "server-only";
import type { AudioVoicePersona } from "@/lib/ai/audio/voices";

const DEFAULT_VOICEBOX_URL = "http://127.0.0.1:17493";

export function voiceboxBaseUrl(): string | undefined {
  const raw = process.env.VOICEBOX_API_URL?.trim();
  if (!raw) return undefined;
  return raw.replace(/\/$/, "");
}

export function hasVoiceboxProvider(): boolean {
  return Boolean(voiceboxBaseUrl());
}

interface VoiceboxGenerateResponse {
  audio?: string;
  audio_base64?: string;
  url?: string;
  error?: string;
}

/**
 * Synthesize speech via a self-hosted Voicebox instance.
 * @see https://github.com/jamiepine/voicebox
 */
export async function synthesizeWithVoicebox(
  text: string,
  persona: AudioVoicePersona,
): Promise<Buffer> {
  const base = voiceboxBaseUrl();
  if (!base) throw new Error("VOICEBOX_API_URL is not configured");

  const profile = persona.voiceboxProfile ?? persona.label;
  const payload: Record<string, string> = {
    text: text.slice(0, 50_000),
    profile,
    language: "en",
  };
  if (persona.deliveryHint) {
    payload.instruction = persona.deliveryHint;
  }

  const res = await fetch(`${base}/speak`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Voicebox-Client-Id": "stoa",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Voicebox TTS failed (${res.status}): ${err.slice(0, 200)}`);
  }

  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("audio") || contentType.includes("octet-stream")) {
    return Buffer.from(await res.arrayBuffer());
  }

  const json = (await res.json()) as VoiceboxGenerateResponse;
  if (json.audio_base64) {
    return Buffer.from(json.audio_base64, "base64");
  }
  if (json.url) {
    const audioRes = await fetch(json.url);
    if (!audioRes.ok) throw new Error("Voicebox returned URL but fetch failed");
    return Buffer.from(await audioRes.arrayBuffer());
  }

  throw new Error("Voicebox response did not include audio data");
}
