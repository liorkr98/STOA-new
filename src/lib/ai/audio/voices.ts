/**
 * Stylized finance-persona voices for audio briefs.
 * These are delivery styles / fun personas — not impersonations of real people.
 */

export interface AudioVoicePersona {
  id: string;
  label: string;
  tagline: string;
  /** Voicebox profile name on the operator's Voicebox server (optional). */
  voiceboxProfile?: string;
  /** Qwen CustomVoice / delivery hint when using Voicebox. */
  deliveryHint?: string;
  /** OpenAI TTS fallback voice when Voicebox is unavailable. */
  openaiVoice: string;
}

/** Default voice when none selected. */
export const DEFAULT_AUDIO_VOICE_ID = "pro";

export const AUDIO_VOICE_PERSONAS: AudioVoicePersona[] = [
  {
    id: "pro",
    label: "Pro Narrator",
    tagline: "Clear, neutral research delivery",
    openaiVoice: "nova",
  },
  {
    id: "bull",
    label: "The Bull",
    tagline: "High-energy market hype — Cramer-style energy",
    voiceboxProfile: "Bull",
    deliveryHint: "Speak with fast, enthusiastic financial TV host energy. Emphasize catalysts.",
    openaiVoice: "onyx",
  },
  {
    id: "oracle",
    label: "The Oracle",
    tagline: "Calm long-term wisdom — Buffett-style patience",
    voiceboxProfile: "Oracle",
    deliveryHint: "Speak slowly and calmly, like a patient long-term investor explaining a moat.",
    openaiVoice: "fable",
  },
  {
    id: "host",
    label: "Market Host",
    tagline: "CNBC desk anchor — crisp headlines",
    voiceboxProfile: "Host",
    deliveryHint: "Professional broadcast tone, crisp headlines, measured urgency.",
    openaiVoice: "echo",
  },
  {
    id: "wolf",
    label: "Wall Street Wolf",
    tagline: "Aggressive bull case — sales-floor swagger",
    voiceboxProfile: "Wolf",
    deliveryHint: "Confident, assertive, slightly aggressive sales-trader energy.",
    openaiVoice: "ash",
  },
  {
    id: "afterhours",
    label: "After Hours",
    tagline: "Soft-spoken deep dive — podcast analyst",
    voiceboxProfile: "AfterHours",
    deliveryHint: "Warm, conversational podcast analyst, thoughtful pauses.",
    openaiVoice: "shimmer",
  },
];

const byId = new Map(AUDIO_VOICE_PERSONAS.map((v) => [v.id, v]));

export function getAudioVoice(id: string | null | undefined): AudioVoicePersona {
  if (id && byId.has(id)) return byId.get(id)!;
  return byId.get(DEFAULT_AUDIO_VOICE_ID)!;
}

export function isValidAudioVoiceId(id: string): boolean {
  return byId.has(id);
}
