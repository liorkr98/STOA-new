"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { NativeClip } from "@/components/video/native-clip";

/**
 * The lead clip on the signed-out root, on a press rather than on arrival.
 *
 * This page takes more traffic than any other, most of it strangers and
 * crawlers, and streaming to all of them costs real money for views that were
 * never asked for. The poster still carries the analyst's face and the play
 * affordance, so the promise is intact; the bytes wait for intent.
 */
export function LandingLeadClip({
  playbackUrl,
  embedUrl,
  thumbnailUrl,
  headline,
  analystId,
}: {
  playbackUrl: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  headline: string;
  analystId: string | null;
}) {
  const [playing, setPlaying] = useState(false);
  const canPlay = Boolean(playbackUrl || embedUrl);

  if (playing && playbackUrl) {
    return <NativeClip src={playbackUrl} poster={thumbnailUrl} muted paused={false} title={headline} />;
  }
  if (playing && embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={headline}
        allow="autoplay; encrypted-media"
        className="absolute inset-0 h-full w-full border-0"
      />
    );
  }

  return (
    <>
      <ClipThumb src={thumbnailUrl} seed={analystId ?? headline} />
      {canPlay ? (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          aria-label={`Play: ${headline}`}
          className="focus-ring absolute inset-0 flex items-center justify-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]">
            <Play size={20} fill="currentColor" strokeWidth={0} className="ml-0.5" />
          </span>
        </button>
      ) : (
        <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]">
          <Play size={20} fill="currentColor" strokeWidth={0} className="ml-0.5" />
        </span>
      )}
    </>
  );
}
