"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { trackEngagement } from "@/lib/engagement/track-client";

/**
 * The analyst's clip at the top of their report.
 *
 * Deliberately not the Feed. The Feed is a reader you fall into and its clips
 * autoplay as they arrive; a report is a page someone chose to open, so this
 * shows the poster frame and waits. Pressing play mounts the player in the same
 * frame rather than routing anywhere: the reader asked to watch this argument,
 * on the page where the argument is made.
 *
 * The player only mounts on that press, which is also why it can carry
 * `autoplay`: by then there has been a user gesture, so no browser blocks it
 * and nothing has been downloaded for a reader who only wanted to read.
 */
export function ReportClip({
  reportId,
  embedUrl,
  thumbnailUrl,
  analystId,
  durationSeconds,
  analystName,
}: {
  reportId: string;
  embedUrl: string | null;
  thumbnailUrl: string | null;
  analystId: string | null;
  durationSeconds: number;
  analystName: string;
}) {
  const [playing, setPlaying] = useState(false);

  const duration =
    durationSeconds > 0
      ? `${Math.floor(durationSeconds / 60)}:${String(Math.round(durationSeconds % 60)).padStart(2, "0")}`
      : null;

  const start = () => {
    setPlaying(true);
    trackEngagement({ reportId, kind: "play", surface: "report" });
  };

  return (
    <figure className="mt-6">
      {/*
        A full-width block so it reads as the top of the argument, with the clip
        itself portrait inside it. Analyst clips are phone-shaped, so a 16:9
        frame pillarboxed the player and, worse, cropped the poster to a
        different shape than the video: the frame jumped the moment anyone
        pressed play. The height is capped so a tall video cannot push the
        writing off the screen. On a phone it fills the column instead, because
        there the clip's shape and the screen's shape already agree.
      */}
      <div className="flex justify-center overflow-hidden rounded-[var(--radius-card)] border border-border bg-[var(--ink)]">
        <div className="relative aspect-[9/16] w-full max-w-full sm:h-[min(70vh,600px)] sm:w-auto">
          {playing && embedUrl ? (
            <iframe
              src={embedUrl}
              title={`${analystName} on this publication`}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              className="absolute inset-0 h-full w-full border-0"
            />
          ) : (
            <button
              type="button"
              onClick={start}
              aria-label={`Play ${analystName}'s video${duration ? `, ${duration}` : ""}`}
              className="focus-ring group absolute inset-0 h-full w-full cursor-pointer"
            >
              <ClipThumb src={thumbnailUrl} seed={analystId} loading="eager" />
              {/* A wash under the controls, so the glyph and the label hold
                against a bright frame as well as a dark one. */}
              <span
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.45),rgba(0,0,0,0.05)_45%,rgba(0,0,0,0.15))]"
              />
              <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_94%,transparent)] text-[var(--ink)] shadow-lg transition-transform duration-[var(--dur-1)] group-hover:scale-105">
                <Play
                  size={24}
                  fill="currentColor"
                  strokeWidth={0}
                  className="ml-1"
                />
              </span>
              <span className="num absolute bottom-3 left-3 rounded bg-[color-mix(in_srgb,var(--ink)_65%,transparent)] px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[var(--paper)]">
                Watch the analyst
              </span>
              {duration ? (
                <span className="num absolute bottom-3 right-3 rounded bg-[color-mix(in_srgb,var(--ink)_65%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--paper)]">
                  {duration}
                </span>
              ) : null}
            </button>
          )}
        </div>
      </div>
      <figcaption className="num mt-2 text-[10px] uppercase tracking-[0.16em] text-text-faint">
        {analystName} makes the case{duration ? ` · ${duration}` : ""}
      </figcaption>
    </figure>
  );
}
