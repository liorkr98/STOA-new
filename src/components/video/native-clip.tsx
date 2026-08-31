"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/design/cn";
import { attachHls } from "@/lib/video/hls";
import { isHlsUrl } from "@/lib/video/direct";

/**
 * The Feed's player: a plain `<video>` we drive ourselves, so the progress bar,
 * mute control, captions and neighbor preloading all behave the way the surface
 * needs. Handles both a stored file and an HLS stream; HLS is the real pipeline
 * and carries the adaptive bitrate ladder.
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
  preload = "auto",
  captionUrl,
  onUnplayable,
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
  preload?: "none" | "metadata" | "auto";
  /** WebVTT track. Most phone viewers never turn sound on, so this carries the argument. */
  captionUrl?: string | null;
  /** The stream could not be played at all. Let the caller fall back to an embed. */
  onUnplayable?: () => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const hls = isHlsUrl(src);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = muted;
  }, [muted]);

  /**
   * HLS needs either native support or hls.js attached to the element, so the
   * source is set here rather than through the `src` attribute. A stored file
   * still uses the attribute, which keeps the common path declarative.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || !hls) return;
    let cancelled = false;
    let attachment: { destroy: () => void } | null = null;

    void attachHls(el, src, () => onUnplayable?.()).then((result) => {
      if (cancelled) {
        result?.destroy();
        return;
      }
      if (result) attachment = result;
      // Native HLS: the attribute is all Safari needs.
      else el.src = src;
    });

    return () => {
      cancelled = true;
      attachment?.destroy();
    };
  }, [hls, src, onUnplayable]);

  /**
   * Autoplay with sound is rejected unless the browser thinks the reader has
   * earned it, and a rejected play() leaves a frozen poster rather than an
   * error. So a remembered sound-on preference falls back to muted playback
   * instead of showing nothing: a silent clip is recoverable, a dead frame is
   * not. The mute control still reflects what the reader asked for.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (paused) {
      el.pause();
      return;
    }
    void el.play().catch(() => {
      if (el.muted) return;
      el.muted = true;
      void el.play().catch(() => undefined);
    });
  }, [paused, src, muted]);

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

  /** A stored file that 404s or a codec the browser refuses also needs the fallback. */
  useEffect(() => {
    const el = ref.current;
    if (!el || !onUnplayable || hls) return;
    const onError = () => onUnplayable();
    el.addEventListener("error", onError);
    return () => el.removeEventListener("error", onError);
  }, [onUnplayable, hls]);

  /**
   * Captions default to showing, because a feed clip plays muted and a silent
   * face makes no argument. Set from script rather than markup: `default` on a
   * `<track>` is only honored on first load, so a track that arrives with a
   * later src (or a remount) would stay hidden.
   */
  useEffect(() => {
    const el = ref.current;
    if (!el || !captionUrl) return;
    const show = () => {
      const track = el.textTracks[0];
      if (track) track.mode = "showing";
    };
    show();
    el.textTracks.addEventListener("addtrack", show);
    return () => el.textTracks.removeEventListener("addtrack", show);
  }, [captionUrl]);

  return (
    <video
      ref={ref}
      src={hls ? undefined : src}
      poster={poster ?? undefined}
      title={title}
      playsInline
      loop
      muted={muted}
      preload={preload}
      autoPlay={!paused}
      crossOrigin={captionUrl ? "anonymous" : undefined}
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
    >
      {captionUrl ? (
        <track kind="captions" src={captionUrl} srcLang="en" label="English" default />
      ) : null}
    </video>
  );
}
