"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/design/cn";

/**
 * Direct-file playback for demo and any stored mp4. Bunny iframes stay on the
 * real pipeline; this is the path that actually shows a picture in the room.
 */
export function NativeClip({
  src,
  poster,
  muted,
  paused,
  title,
  className,
  onProgress,
  previewSeconds,
}: {
  src: string;
  poster?: string | null;
  muted: boolean;
  paused: boolean;
  title: string;
  className?: string;
  onProgress?: (ratio: number) => void;
  /** Loop only this many seconds when the publication is a long clip. */
  previewSeconds?: number | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (paused) el.pause();
    else void el.play().catch(() => undefined);
  }, [paused, src]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onProgress) return;
    const cap = previewSeconds && previewSeconds > 0 ? previewSeconds : null;
    const onTime = () => {
      if (cap && el.currentTime >= cap) {
        el.currentTime = 0;
      }
      const denom = cap ? cap : el.duration;
      if (denom > 0) onProgress(Math.min(1, el.currentTime / denom));
    };
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, [onProgress, previewSeconds]);

  return (
    <video
      ref={ref}
      src={src}
      poster={poster ?? undefined}
      title={title}
      playsInline
      loop
      muted={muted}
      autoPlay={!paused}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    />
  );
}
