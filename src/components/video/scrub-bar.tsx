"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/design/cn";

/**
 * The thin line along one edge of a playing clip: where playback is, and a
 * handle to drag it anywhere. Shared by every surface that plays a video in
 * its own element (the Feed's stage, the report page, the Explore and
 * Dispatch cards, the landing lead), so a reader learns it once.
 *
 * Quiet at rest: a hairline the height of a border. It grows while it is
 * pressed or hovered so it is easy to hold on a phone, and the hit area is
 * taller than the line is, so a thumb does not have to land on three pixels.
 *
 * The position is a ratio of the window that plays, not seconds: the player
 * owns its trim and preview cap, so it maps the ratio to a time. While the
 * bar is being dragged it draws the finger's position rather than the
 * player's, so it never lags the hand that is moving it.
 */
export function ScrubBar({
  progress,
  onSeek,
  onScrubbing,
  edge = "bottom",
  hit = 24,
  className,
  label = "Position in the clip",
}: {
  /** 0 to 1, the player's own position. */
  progress: number;
  /** Move playback to this ratio of the clip. Called throughout a drag. */
  onSeek: (ratio: number) => void;
  /** True while a finger or a pointer holds the bar. */
  onScrubbing?: (scrubbing: boolean) => void;
  /** Which edge of the frame the line sits on. */
  edge?: "top" | "bottom";
  /** The touchable band's height in pixels; the line itself stays thin. */
  hit?: number;
  className?: string;
  label?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [hover, setHover] = useState(false);

  const ratioAt = useCallback((clientX: number) => {
    const el = trackRef.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return 0;
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  const shown = drag ?? Math.min(1, Math.max(0, progress));
  const active = drag != null || hover;

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(shown * 100)}
      aria-valuetext={`${Math.round(shown * 100)}%`}
      data-scrubbing={drag != null ? "" : undefined}
      onPointerDown={(e) => {
        // The bar is the only thing that should hear this press: under it
        // sit the stage's pause button and, in the Feed, a snapping track.
        e.stopPropagation();
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const r = ratioAt(e.clientX);
        setDrag(r);
        onScrubbing?.(true);
        onSeek(r);
      }}
      onPointerMove={(e) => {
        if (drag == null || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const r = ratioAt(e.clientX);
        setDrag(r);
        onSeek(r);
      }}
      onPointerUp={(e) => {
        if (drag == null) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        onSeek(ratioAt(e.clientX));
        setDrag(null);
        onScrubbing?.(false);
      }}
      onPointerCancel={() => {
        if (drag == null) return;
        setDrag(null);
        onScrubbing?.(false);
      }}
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 0.1 : 0.05;
        let next: number | null = null;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") next = Math.min(1, shown + step);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = Math.max(0, shown - step);
        if (e.key === "Home") next = 0;
        if (e.key === "End") next = 1;
        if (next == null) return;
        e.preventDefault();
        e.stopPropagation();
        onSeek(next);
      }}
      className={cn(
        "focus-ring absolute inset-x-0 flex cursor-pointer select-none [touch-action:none]",
        edge === "top" ? "top-0 items-start" : "bottom-0 items-end",
        className,
      )}
      style={{ height: hit }}
    >
      <div
        aria-hidden
        className={cn(
          "w-full overflow-hidden bg-[color-mix(in_srgb,var(--paper)_25%,transparent)] transition-[height] duration-[var(--dur-1)] ease-[var(--ease-out)]",
          active ? "h-[6px]" : "h-[3px]",
        )}
      >
        <div
          className="h-full w-full origin-left bg-[color-mix(in_srgb,var(--paper)_92%,transparent)]"
          style={{ transform: `scaleX(${shown})` }}
        />
      </div>
    </div>
  );
}
