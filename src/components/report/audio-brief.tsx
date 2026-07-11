"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { Headphones, RefreshCw } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { DEFAULT_AUDIO_VOICE_ID } from "@/lib/ai/audio/voices";

type AudioMode = "brief" | "extended" | "full";

interface VoiceOption {
  id: string;
  label: string;
  tagline: string;
}

interface QuoteResponse {
  quote: {
    credits: number;
    estimatedMinutes: number;
    estimatedScriptChars: number;
    tier: string;
    cached: boolean;
  };
  cached: boolean;
  voices: VoiceOption[];
  tts_provider: string | null;
}

interface CachedVoice {
  voice_id: string;
  duration_estimate_sec: number | null;
}

/**
 * Audio brief with Voicebox/OpenAI TTS, finance-persona voices, and Supabase cache.
 * Generate once per report+voice — replays are free for all readers.
 */
export function AudioBrief({ reportId, isAuthor }: { reportId: string; isAuthor: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "none" | "locked" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [voiceId, setVoiceId] = useState(DEFAULT_AUDIO_VOICE_ID);
  const [mode, setMode] = useState<AudioMode>("brief");
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [cachedVoices, setCachedVoices] = useState<CachedVoice[]>([]);
  const [quote, setQuote] = useState<QuoteResponse["quote"] | null>(null);

  const fetchQuote = useCallback(async (v: string, m: AudioMode) => {
    try {
      const res = await fetch(
        `/api/reports/${reportId}/audio/quote?voice=${encodeURIComponent(v)}&mode=${m}`,
      );
      if (!res.ok) return;
      const body = (await res.json()) as QuoteResponse;
      setQuote(body.quote);
      setVoices(body.voices);
    } catch {
      /* optional */
    }
  }, [reportId]);

  const fetchPlayback = useCallback(async (v: string) => {
    try {
      const res = await fetch(`/api/reports/${reportId}/audio?voice=${encodeURIComponent(v)}`);
      if (res.status === 403) {
        setStatus("locked");
        return;
      }
      if (!res.ok) {
        setUrl(null);
        setStatus("none");
        return;
      }
      const body = (await res.json()) as { url: string };
      setUrl(body.url);
      setStatus("ready");
    } catch {
      setStatus("none");
    }
  }, [reportId]);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(`/api/reports/${reportId}/audio`);
      if (res.status === 403) {
        setStatus("locked");
        return;
      }
      if (res.ok) {
        const body = (await res.json()) as { voices: CachedVoice[] };
        setCachedVoices(body.voices ?? []);
        if (body.voices?.length) {
          const first = body.voices[0]!.voice_id;
          setVoiceId(first);
          await fetchPlayback(first);
          return;
        }
      }
      setStatus("none");
    } catch {
      setStatus("none");
    }
  }, [reportId, fetchPlayback]);

  useEffect(() => {
    void fetchMeta();
  }, [fetchMeta]);

  useEffect(() => {
    void fetchQuote(voiceId, mode);
  }, [voiceId, mode, fetchQuote]);

  function generate(force = false) {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/reports/${reportId}/audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voice: voiceId, mode, force }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
          need?: number;
          have?: number;
        } | null;
        setError(
          res.status === 402
            ? `Needs ${body?.need} AI credits (you have ${body?.have}).`
            : body?.error ?? "Could not generate",
        );
        return;
      }
      const body = (await res.json()) as { url?: string; cached?: boolean };
      if (body.url) {
        setUrl(body.url);
        setStatus("ready");
      } else {
        await fetchPlayback(voiceId);
      }
      await fetchMeta();
      await fetchQuote(voiceId, mode);
    });
  }

  if (status === "locked") return null;

  const isCached = cachedVoices.some((c) => c.voice_id === voiceId);
  const creditLabel =
    quote?.cached || isCached
      ? "Cached — free replay"
      : quote
        ? `Generate (${quote.credits} credits · ~${quote.estimatedMinutes} min)`
        : "Generate";

  return (
    <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-2 text-text-mute">
          <Headphones size={15} className="text-text-faint" />
          <span className="t-eyebrow">Audio brief</span>
        </span>
        {cachedVoices.length > 0 && (
          <span className="t-meta text-[11px] text-[var(--verdigris)]">
            {cachedVoices.length} voice{cachedVoices.length > 1 ? "s" : ""} saved
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          value={voiceId}
          onChange={(e) => {
            setVoiceId(e.target.value);
            setUrl(null);
            setStatus(cachedVoices.some((c) => c.voice_id === e.target.value) ? "ready" : "none");
            void fetchPlayback(e.target.value);
          }}
          className="focus-ring h-8 rounded-[var(--radius-btn)] border border-border bg-background px-2 text-[12px]"
          aria-label="Voice persona"
        >
          {(voices.length ? voices : [{ id: voiceId, label: voiceId, tagline: "" }]).map((v) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>

        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as AudioMode)}
          disabled={isCached && !isAuthor}
          className="focus-ring h-8 rounded-[var(--radius-btn)] border border-border bg-background px-2 text-[12px]"
          aria-label="Audio length"
        >
          <option value="brief">~60s brief</option>
          <option value="extended">3–5 min extended</option>
          <option value="full">Full narration</option>
        </select>
      </div>

      {voices.find((v) => v.id === voiceId)?.tagline && (
        <p className="t-meta text-[11px] text-text-mute">
          {voices.find((v) => v.id === voiceId)?.tagline}
        </p>
      )}

      {status === "ready" && url ? (
        <audio controls preload="none" src={url} className="h-9 w-full min-w-0" />
      ) : (
        <span className="t-meta text-[12px] text-text-mute">
          {status === "loading" ? "Checking..." : "No audio for this voice yet"}
        </span>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => generate(isAuthor && status === "ready")}
          disabled={pending || (isCached && !isAuthor && status === "ready")}
          className={cn(
            "focus-ring inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] px-2.5 text-[12px] font-medium",
            status === "ready" && isAuthor
              ? "text-text-mute hover:bg-surface-2"
              : "bg-accent text-accent-ink",
          )}
        >
          <RefreshCw size={13} className={pending ? "animate-spin" : undefined} />
          {pending
            ? "Generating..."
            : status === "ready" && isAuthor
              ? "Regenerate"
              : creditLabel}
        </button>
        {quote && !quote.cached && !isCached && (
          <span className="t-meta text-[11px] text-text-faint">
            DeepSeek script + Voicebox/OpenAI speech · one-time per voice
          </span>
        )}
      </div>

      {error && <span className="text-[12px] text-[var(--down)]">{error}</span>}
    </div>
  );
}
