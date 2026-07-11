import "server-only";
import type { AudioVoicePersona } from "@/lib/ai/audio/voices";
import { hasOpenAiTtsProvider, synthesizeWithOpenAi } from "@/lib/ai/tts/openai";
import { hasVoiceboxProvider, synthesizeWithVoicebox } from "@/lib/ai/tts/voicebox";

export type TtsProvider = "voicebox" | "openai";

export function hasTtsProvider(): boolean {
  return hasVoiceboxProvider() || hasOpenAiTtsProvider();
}

export function activeTtsProvider(): TtsProvider | null {
  if (hasVoiceboxProvider()) return "voicebox";
  if (hasOpenAiTtsProvider()) return "openai";
  return null;
}

/** Prefer Voicebox (self-hosted, persona voices); fall back to OpenAI. */
export async function synthesizeSpeech(
  text: string,
  persona: AudioVoicePersona,
): Promise<{ buffer: Buffer; provider: TtsProvider }> {
  if (hasVoiceboxProvider()) {
    try {
      const buffer = await synthesizeWithVoicebox(text, persona);
      return { buffer, provider: "voicebox" };
    } catch (e) {
      if (!hasOpenAiTtsProvider()) throw e;
      // Voicebox down — fall back to OpenAI for production resilience.
    }
  }

  if (hasOpenAiTtsProvider()) {
    const buffer = await synthesizeWithOpenAi(text, persona);
    return { buffer, provider: "openai" };
  }

  throw new Error(
    "No TTS provider configured. Set VOICEBOX_API_URL or OPENAI_API_KEY.",
  );
}
