"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Play, ArrowRight, Lock, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { Avatar } from "@/components/ui/avatar";
import { DirectionTag } from "@/components/ui/tag";
import { trackVideoEvent } from "@/lib/video/track-client";
import { prefetchVideoStart, warmVideoConnections } from "@/lib/video/prefetch";
import type { VideoCardData } from "@/lib/video/card-data";

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

function disclosureLine(d: VideoCardData["disclosure"]): string | null {
  const parts: string[] = [];
  if (d.positionHeld === true) parts.push("Position held");
  else if (d.positionHeld === false) parts.push("No position");
  if (d.compensationTied === true) parts.push("Compensation disclosed");
  else if (d.compensationTied === false) parts.push("No compensation");
  return parts.length ? parts.join(" · ") : null;
}

/**
 * The reusable video card (Part 4.1). Video is the door; the linked report is
 * the room. Used by Discover (grid) and the Dispatch (lead + secondary) -- one
 * component, two surfaces.
 *
 * Motion: no entrance animation (Discover is a high-frequency surface, per
 * docs/MOTION.md). Hover-preview and inline-play are the only motion, and the
 * preview is the core content, not decoration. Everything respects the static
 * poster default.
 */
export function VideoCard({
  data,
  variant = "grid",
  autoPreview,
}: {
  data: VideoCardData;
  variant?: "grid" | "lead";
  /** Force muted preview to play without hover (used by the lead story). */
  autoPreview?: boolean;
}) {
  const router = useRouter();
  // Hover and viewport drive this; autoPreview is a prop that forces it on, so
  // it is folded in during render instead of pushed into state by the effect.
  const [hovering, setHovering] = useState(false);
  const previewing = autoPreview || hovering;
  const [playing, setPlaying] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);

  const isLead = variant === "lead";
  const disclosure = disclosureLine(data.disclosure);

  // Warm the CDN/embed connections as soon as the card mounts (cheap).
  useEffect(() => {
    warmVideoConnections(data.embedUrl, data.playbackUrl);
  }, [data.embedUrl, data.playbackUrl]);

  // Prefetch the first ~5s of the stream the moment intent is shown
  // (hover on desktop, in-view on mobile), so tapping play starts instantly.
  useEffect(() => {
    if (previewing) void prefetchVideoStart(data.playbackUrl);
  }, [previewing, data.playbackUrl]);
  const reportHref = `/report/${data.reportId}`;
  const accessLabel =
    data.access === "paid"
      ? data.price != null
        ? `$${data.price}`
        : "Paid"
      : data.access === "subscribers"
        ? "Subscribers"
        : null;

  // Mobile / lead: play the muted preview when the card scrolls into view.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || playing || autoPreview) return;
    if (typeof IntersectionObserver === "undefined") return;
    const isTouch = window.matchMedia?.("(hover: none)").matches;
    if (!isTouch) return;
    const obs = new IntersectionObserver(
      ([entry]) => setHovering(entry.isIntersecting && entry.intersectionRatio > 0.6),
      { threshold: [0, 0.6, 1] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [autoPreview, playing]);

  const startPlay = useCallback(() => {
    setPlaying(true);
    setShowDisclosure(true);
    if (!viewTracked.current) {
      viewTracked.current = true;
      trackVideoEvent(data.id, { watchedSeconds: 0 });
    }
  }, [data.id]);

  // Keep the disclosure overlay up for the first few seconds of playback (2.6).
  useEffect(() => {
    if (!showDisclosure) return;
    const t = setTimeout(() => setShowDisclosure(false), 4500);
    return () => clearTimeout(t);
  }, [showDisclosure]);

  const goToReport = useCallback(() => {
    trackVideoEvent(data.id, { clickedThroughToReport: true });
    router.push(reportHref);
  }, [data.id, reportHref, router]);

  const embedSrc = playing
    ? `${data.embedUrl}${data.embedUrl.includes("?") ? "&" : "?"}autoplay=true&muted=true`
    : data.embedUrl;

  return (
    <article
      ref={rootRef}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface",
        "transition-colors duration-[var(--dur-1)] ease-[var(--ease-hover)] hover:border-border-strong",
        isLead && "sm:rounded-[calc(var(--radius-card)+2px)]",
      )}
      onMouseEnter={() => !playing && setHovering(true)}
      onMouseLeave={() => !playing && setHovering(false)}
    >
      {/* Media region: static poster -> muted preview on hover/in-view -> inline player on tap. */}
      <div
        className={cn(
          "relative w-full overflow-hidden bg-[var(--ink)]",
          isLead ? "aspect-video" : "aspect-video",
        )}
      >
        {playing ? (
          <>
            <iframe
              key={embedSrc}
              src={embedSrc}
              title={data.headline}
              loading="lazy"
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
            {showDisclosure && disclosure && (
              <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center gap-1.5 bg-[var(--ink)]/85 px-3 py-2 text-[11px] font-medium text-[var(--paper)]">
                <ShieldCheck size={12} aria-hidden />
                <span>{disclosure}</span>
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            onClick={startPlay}
            aria-label={`Play video: ${data.headline}`}
            className="absolute inset-0 h-full w-full focus-ring"
          >
            {/* Static poster */}
            {data.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.thumbnailUrl}
                alt=""
                className={cn(
                  "absolute inset-0 h-full w-full object-cover transition-opacity duration-[var(--dur-2)]",
                  previewing && data.previewUrl ? "opacity-0" : "opacity-100",
                )}
                loading="lazy"
              />
            )}
            {/* Animated muted preview (earned continuous motion: the content itself) */}
            {previewing && data.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={data.previewUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            )}
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 flex items-center justify-center transition-opacity duration-[var(--dur-2)]",
                previewing ? "opacity-90" : "opacity-100",
              )}
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--paper)]/90 text-[var(--ink)] shadow-[var(--shadow-card)]">
                <Play size={20} className="ml-0.5" fill="currentColor" />
              </span>
            </span>
            {/* Duration badge */}
            <span className="num absolute bottom-2 right-2 z-10 rounded-[var(--r-tag)] bg-[var(--ink)]/80 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--paper)]">
              {formatDuration(data.durationSeconds)}
            </span>
            {accessLabel && (
              <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-[var(--r-tag)] bg-[var(--ink)]/80 px-1.5 py-0.5 text-[11px] font-medium text-[var(--paper)]">
                <Lock size={10} aria-hidden />
                {accessLabel}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Metadata: identical trust surface to the report card, just anchored under video. */}
      <div className={cn("flex flex-1 flex-col gap-2 p-4", isLead && "sm:p-5")}>
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {data.ticker && (
            <span className="num rounded-[var(--r-tag)] border border-border px-1.5 py-px font-semibold">
              {data.ticker}
            </span>
          )}
          {data.direction && <DirectionTag direction={data.direction} />}
        </div>

        <Link href={reportHref} className="focus-ring rounded-[var(--radius-btn)]">
          <h3
            className={cn(
              "font-display font-semibold text-text transition-colors duration-[var(--dur-2)] group-hover:text-text-mute",
              isLead ? "text-xl leading-tight sm:text-2xl" : "text-base leading-snug",
            )}
          >
            {data.headline}
          </h3>
        </Link>

        <div className="mt-auto flex items-center gap-2.5 pt-1">
          <Link
            href={`/analyst/${data.analyst.handle}`}
            className="flex min-w-0 items-center gap-2 focus-ring rounded-[var(--r-tag)]"
          >
            <Avatar src={data.analyst.avatarUrl} name={data.analyst.displayName} size="sm" />
            <span className="truncate text-xs font-medium text-text">{data.analyst.displayName}</span>
          </Link>
        </div>

        {/* Persistent, always-visible click-through path (the Part 1 metric). */}
        <button
          type="button"
          onClick={goToReport}
          className="focus-ring mt-1 inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-border-strong hover:bg-surface-2"
        >
          {accessLabel ? `Read the full report · ${accessLabel}` : "Read the full report"}
          <ArrowRight size={13} aria-hidden />
        </button>
      </div>
    </article>
  );
}
