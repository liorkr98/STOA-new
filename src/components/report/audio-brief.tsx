"use client";

import { useEffect, useState, useTransition } from "react";
import { Headphones, RefreshCw } from "lucide-react";
import { cn } from "@/lib/design/cn";

/**
 * AudioBrief (H4): "Listen to the bottom line" -- a ~60s TTS brief of the
 * thesis and call. Playback URL is a short-lived signed link minted by the
 * gated route (canReadReport), so premium briefs stay premium. The author sees
 * a generate/regenerate control; readers just get the player when one exists.
 */
export function AudioBrief({ reportId, isAuthor }: { reportId: string; isAuthor: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "none" | "locked" | "ready">("loading");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function fetchUrl() {
    try {
      const res = await fetch(`/api/reports/${reportId}/audio`);
      if (res.status === 403) {
        setStatus("locked");
        return;
      }
      if (!res.ok) {
        setStatus("none");
        return;
      }
      const body = (await res.json()) as { url: string };
      setUrl(body.url);
      setStatus("ready");
    } catch {
      setStatus("none");
    }
  }

  useEffect(() => {
    // Started on a later task: fetchUrl moves the brief's status, and doing
    // that inside the effect body renders the card twice before first paint.
    const id = setTimeout(() => void fetchUrl(), 0);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  function generate() {
    setError(null);
    start(async () => {
      const res = await fetch(`/api/reports/${reportId}/audio`, { method: "POST" });
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
      await fetchUrl();
    });
  }

  if (status === "locked") return null;
  if (status === "none" && !isAuthor) return null;
  if (status === "loading" && !isAuthor) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-border bg-surface px-4 py-3">
      <span className="flex items-center gap-2 text-text-mute">
        <Headphones size={15} className="text-text-faint" />
        <span className="t-eyebrow">Audio brief</span>
      </span>

      {status === "ready" && url ? (
        <audio controls preload="none" src={url} className="h-9 min-w-0 flex-1" />
      ) : (
        <span className="t-meta flex-1 text-[12px]">
          {status === "loading" ? "Checking..." : "No audio brief yet"}
        </span>
      )}

      {isAuthor && (
        <button
          type="button"
          onClick={generate}
          disabled={pending}
          className={cn(
            "focus-ring inline-flex h-8 items-center gap-1.5 rounded-[var(--radius-btn)] px-2.5 text-[12px] font-medium",
            status === "ready"
              ? "text-text-mute hover:bg-surface-2"
              : "bg-accent text-accent-ink",
          )}
        >
          <RefreshCw size={13} className={pending ? "animate-spin" : undefined} />
          {pending ? "Generating..." : status === "ready" ? "Regenerate" : "Generate (3 credits)"}
        </button>
      )}
      {error && <span className="w-full text-[12px] text-[var(--down)]">{error}</span>}
    </div>
  );
}
