"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { NativeClip } from "@/components/video/native-clip";
import { isDirectVideoUrl } from "@/lib/video/direct";
import { trackEngagement } from "@/lib/engagement/track-client";
import { cn } from "@/lib/design/cn";

/**
 * The analyst's clip on their report, beside the writing rather than above it.
 *
 * Deliberately not the Feed. The Feed is a reader you fall into and its clips
 * autoplay as they arrive; a report is a page someone chose to open, so this
 * shows the poster frame and waits. Pressing play mounts the player in the same
 * frame rather than routing anywhere: the reader asked to watch this argument,
 * on the page where the argument is made.
 *
 * The player only mounts on that press, which is also why it can carry
 * `autoplay`: by then there has been a user gesture, so no browser blocks it,
 * and nothing is downloaded for a reader who only wanted to read.
 *
 * On desktop the report page makes this the second column and sticks it, so it
 * holds still while the text scrolls past. On a phone there is no second column,
 * so it leads the page and then docks: once it is playing and the reader has
 * scrolled it out of sight, it shrinks to a corner and keeps going.
 */

/** Below this the page is one column and the docked player applies. */
const TWO_COLUMN = "(min-width: 1024px)";

export function ReportClip({
  reportId,
  embedUrl,
  playbackUrl,
  thumbnailUrl,
  analystId,
  durationSeconds,
  analystName,
}: {
  reportId: string;
  embedUrl: string | null;
  playbackUrl?: string | null;
  thumbnailUrl: string | null;
  analystId: string | null;
  durationSeconds: number;
  analystName: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [scrolledAway, setScrolledAway] = useState(false);
  const slotRef = useRef<HTMLDivElement>(null);
  // The slot holds this height once the player leaves it, so the page does not
  // jump. Measured in the observer callback, at the moment docking is decided
  // and while the clip is still in flow.
  const [slotHeight, setSlotHeight] = useState(0);

  // Derived rather than reset in an effect, so stopping the video un-docks it
  // without a second render pass just to undo a flag.
  const docked = playing && scrolledAway;

  const duration =
    durationSeconds > 0
      ? `${Math.floor(durationSeconds / 60)}:${String(Math.round(durationSeconds % 60)).padStart(2, "0")}`
      : null;

  const start = () => {
    setPlaying(true);
    trackEngagement({ reportId, kind: "play", surface: "report" });
  };

  /**
   * Dock once the clip is playing and has been scrolled away from, and only
   * where the page is a single column: on desktop it is already sticky beside
   * the text and has not gone anywhere.
   *
   * The player is never re-parented. Moving an iframe in the DOM reloads it,
   * which would restart the video the moment it docked, so the same element
   * simply changes position and the slot holds its measured height so the page
   * does not jump.
   */
  useEffect(() => {
    if (!playing) return;
    const el = slotRef.current;
    if (!el) return;

    const twoColumn = window.matchMedia(TWO_COLUMN);
    const io = new IntersectionObserver(
      ([entry]) => {
        const away = !twoColumn.matches && !entry.isIntersecting;
        // Still in flow at this point, so this is the natural height.
        if (away) setSlotHeight(el.offsetHeight);
        setScrolledAway(away);
      },
      { threshold: 0 },
    );
    io.observe(el);

    const onWidthChange = () => {
      if (twoColumn.matches) setScrolledAway(false);
    };
    twoColumn.addEventListener("change", onWidthChange);
    return () => {
      io.disconnect();
      twoColumn.removeEventListener("change", onWidthChange);
    };
  }, [playing]);

  const returnToArticle = useCallback(() => {
    slotRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  return (
    <figure className="lg:mt-0">
      <div ref={slotRef} style={docked && slotHeight ? { height: slotHeight } : undefined}>
        <div
          className={cn(
            docked
              ? "fixed bottom-4 right-4 z-40 w-[132px] overflow-hidden rounded-[var(--radius-card)] border border-border shadow-2xl"
              : // In the column it hugs the player, so a portrait clip does not
                // sit in a band of its own letterboxing. Only there: below `lg`
                // the clip fills the width, and `w-fit` against a `w-full`
                // child collapses the box to nothing.
                "flex justify-center overflow-hidden rounded-[var(--radius-card)] border border-border lg:mx-auto lg:w-fit",
            "bg-[var(--ink)]",
          )}
        >
          <div
            className={cn(
              "relative aspect-[9/16]",
              docked
                ? "w-full"
                : "w-full max-w-full sm:h-[min(60vh,520px)] sm:w-auto lg:h-[min(50vh,440px)]",
            )}
          >
            {playing && isDirectVideoUrl(playbackUrl) && playbackUrl ? (
              <NativeClip
                src={playbackUrl}
                poster={thumbnailUrl}
                muted={false}
                paused={false}
                title={`${analystName} on this publication`}
              />
            ) : playing && embedUrl ? (
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
                  <Play size={24} fill="currentColor" strokeWidth={0} className="ml-1" />
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

          {/* Docked only: a way back to the clip's place in the page, and a way
              to stop it. Without these the reader can neither find it again nor
              get rid of it. */}
          {docked ? (
            <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-1 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),transparent)] p-1">
              <button
                type="button"
                onClick={returnToArticle}
                className="focus-ring num rounded px-1.5 py-1 text-[9px] uppercase tracking-[0.14em] text-white/90 hover:text-white"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setPlaying(false)}
                aria-label="Stop the video"
                className="focus-ring rounded p-1 text-white/90 hover:text-white"
              >
                <X size={13} strokeWidth={1.8} />
              </button>
            </div>
          ) : null}
        </div>
      </div>
      <figcaption className="num mt-2 text-[10px] uppercase tracking-[0.16em] text-text-faint">
        {analystName} makes the case{duration ? ` · ${duration}` : ""}
      </figcaption>
    </figure>
  );
}
