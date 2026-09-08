"use client";

import { useEffect, useRef, useState } from "react";
import { OverlayVisualBody } from "@/components/compose/overlay-visual";
import { cn } from "@/lib/design/cn";
import {
  activeAt,
  clamp,
  gridStyle,
  insetBox,
  overlayOpacity,
  type Overlay,
  type StoredOverlayCard,
  type TextOverlay,
  type VisualOverlay,
} from "@/lib/compose/overlays";
import type { DraftCard } from "@/lib/compose/cards";

/**
 * The overlays over a playing clip, at one moment in time.
 *
 * This is the one renderer for overlays: Stoa's player draws them from the
 * stored edit at playback, and Compose's "Preview as it will publish" draws
 * them through the same component, so what the creator sees is what plays on
 * the site. Positions, sizes and opacity are pure CSS from the overlay model;
 * nothing here depends on the size of the stage except the full-frame card,
 * which scales with the picture so it reads as a slide at any player width.
 *
 * The rules: a full-frame visual owns the picture while it shows (the video
 * dims behind it and nothing else draws); otherwise insets and text sit over
 * the video where they were placed. Pointer events pass through to the video.
 */
export function OverlayLayer({
  overlays,
  cards,
  time,
  ticker,
  className,
}: {
  overlays: Overlay[];
  cards: (DraftCard | StoredOverlayCard)[];
  /** Playback position in seconds of the untrimmed clip. */
  time: number;
  ticker?: string;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const fullFrameZoom = clamp(width / 520, 1, 2);

  const active = activeAt(overlays, time);
  const cutaway = active.find((o): o is VisualOverlay => o.kind === "visual" && o.mode === "cutaway");
  const insets = cutaway ? [] : active.filter((o): o is VisualOverlay => o.kind === "visual" && o.mode === "inset");
  const texts = cutaway ? [] : active.filter((o): o is TextOverlay => o.kind === "text");
  const deck = cards as DraftCard[];

  return (
    <div ref={ref} aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden text-white", className)}>
      {cutaway ? (
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_62%,transparent)]" />
          <div className="absolute inset-[4%] flex items-center justify-center">
            <div
              className="flex items-center justify-center"
              style={{
                zoom: fullFrameZoom,
                width: `${100 / fullFrameZoom}%`,
                height: `${100 / fullFrameZoom}%`,
                opacity: overlayOpacity(cutaway),
              }}
            >
              <OverlayVisualBody
                source={cutaway.source}
                cards={deck}
                ticker={ticker}
                className="h-full w-full shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
              />
            </div>
          </div>
        </div>
      ) : null}

      {insets.map((o) => (
        <div key={o.id} className="absolute" style={{ ...gridStyle(o.position), ...insetBox(o) }}>
          <div className="h-full w-full" style={{ opacity: overlayOpacity(o) }}>
            <OverlayVisualBody source={o.source} cards={deck} ticker={ticker} className="h-full w-full" />
          </div>
        </div>
      ))}

      {texts.map((o) => (
        <div
          key={o.id}
          className={cn(
            "absolute max-w-[80%] px-1 font-sans font-semibold leading-tight",
            "text-white [text-shadow:0_1px_3px_rgba(0,0,0,0.7)]",
            o.size === "sm" ? "text-[0.875rem]" : o.size === "md" ? "text-[1.25rem]" : "text-[1.75rem]",
          )}
          style={gridStyle(o.position)}
        >
          {o.text}
        </div>
      ))}
    </div>
  );
}
