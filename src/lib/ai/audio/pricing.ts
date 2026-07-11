import "server-only";

/** ~150 words / 60 seconds at typical narration pace. */
export const AUDIO_BRIEF_BASE_CHARS = 900;

/** Flat fee for a standard ~60s brief. */
export const AUDIO_BRIEF_BASE_CREDITS = 3;

/** Additional credits per 500 spoken characters beyond the base tier. */
export const AUDIO_CREDITS_PER_500_CHARS = 2;

/** Cap so a 20-minute narration cannot drain a wallet in one click. */
export const AUDIO_BRIEF_MAX_CREDITS = 25;

/** OpenAI tts-1 list price: $15 / 1M characters (platform cost reference). */
export const OPENAI_TTS_USD_PER_CHAR = 15 / 1_000_000;

/** Self-hosted Voicebox has no per-char API fee — operator bears GPU/compute. */
export const VOICEBOX_MARGINAL_USD_PER_CHAR = 0;

export type AudioBriefTier = "brief" | "extended" | "full";

export type AudioBriefMode = AudioBriefTier;

export interface AudioBriefQuote {
  mode: AudioBriefMode;
  estimatedScriptChars: number;
  estimatedMinutes: number;
  credits: number;
  tier: AudioBriefTier;
  platformCostUsdOpenAi: number;
  platformCostUsdVoicebox: number;
  cached: boolean;
}

function tierForChars(chars: number): AudioBriefTier {
  if (chars <= 1_200) return "brief";
  if (chars <= 5_000) return "extended";
  return "full";
}

/** Credits from final script length (after generation). */
export function creditsForScriptChars(scriptChars: number): number {
  const chars = Math.max(1, scriptChars);
  if (chars <= AUDIO_BRIEF_BASE_CHARS) return AUDIO_BRIEF_BASE_CREDITS;
  const extra = chars - AUDIO_BRIEF_BASE_CHARS;
  const surcharge = Math.ceil(extra / 500) * AUDIO_CREDITS_PER_500_CHARS;
  return Math.min(AUDIO_BRIEF_MAX_CREDITS, AUDIO_BRIEF_BASE_CREDITS + surcharge);
}

/** ~750 chars/min spoken English for rough duration. */
export function estimateMinutes(scriptChars: number): number {
  return Math.max(1, Math.round(scriptChars / 750));
}

/** Pre-generation estimate from report body size + mode. */
export function estimateScriptChars(bodyPlainChars: number, mode: AudioBriefMode): number {
  switch (mode) {
    case "brief":
      return AUDIO_BRIEF_BASE_CHARS;
    case "extended":
      return Math.min(5_000, Math.max(AUDIO_BRIEF_BASE_CHARS, Math.round(bodyPlainChars * 0.35)));
    case "full":
      return Math.min(15_000, Math.max(2_000, Math.round(bodyPlainChars * 0.85)));
    default:
      return AUDIO_BRIEF_BASE_CHARS;
  }
}

export function quoteAudioBrief(options: {
  bodyPlainChars: number;
  mode: AudioBriefMode;
  cached: boolean;
}): AudioBriefQuote {
  const estimatedScriptChars = estimateScriptChars(options.bodyPlainChars, options.mode);
  const credits = options.cached ? 0 : creditsForScriptChars(estimatedScriptChars);
  return {
    mode: options.mode,
    estimatedScriptChars,
    estimatedMinutes: estimateMinutes(estimatedScriptChars),
    credits,
    tier: tierForChars(estimatedScriptChars),
    platformCostUsdOpenAi: estimatedScriptChars * OPENAI_TTS_USD_PER_CHAR,
    platformCostUsdVoicebox: estimatedScriptChars * VOICEBOX_MARGINAL_USD_PER_CHAR,
    cached: options.cached,
  };
}
