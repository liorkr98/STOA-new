import "server-only";
import { bunnyEmbedUrl } from "@/lib/video/bunny";
import type { VideoClipCard } from "@/lib/db/video-clips";
import type { VideoCardData } from "@/lib/video/card-data";
import { resolveClipPlayback } from "@/lib/demo/clips";
import { isDirectVideoUrl } from "@/lib/video/direct";

/**
 * Server-side mapper: video_clips row (+ joined report) -> client-safe card data
 * (Part 4.1). Builds the Bunny embed URL here so no provider/env code reaches the
 * browser. Returns null for clips whose report failed to join (never render an
 * orphan -- Part 0's rule made visible).
 */
export function toVideoCardData(card: VideoClipCard): VideoCardData | null {
  const report = card.report;
  if (!report) return null;

  let embedUrl = card.playback_url;
  try {
    embedUrl = bunnyEmbedUrl(card.bunny_video_guid, { autoplay: false, muted: true });
  } catch {
    // Bunny env not configured; fall back to the stored playback URL.
  }

  const author = report.author;
  const ticker = (report.ticker ?? report.prediction?.ticker ?? "").toUpperCase() || null;
  const headline = report.title?.trim() || report.summary?.trim() || "Untitled research";
  const seed = [...card.id].reduce((n, ch) => n + ch.charCodeAt(0), 0);
  const media = resolveClipPlayback({
    playbackUrl: card.playback_url,
    thumbnailUrl: card.thumbnail_url,
    index: seed,
  });
  /**
   * Only a direct file may stand in for the embed.
   *
   * This card renders `embedUrl` inside an iframe whenever the media is not a
   * direct file, so an HLS manifest must never land here: an iframe pointed at
   * a playlist downloads a text file instead of showing a player. HLS on this
   * surface stays with the provider's embed, which keeps its own chrome. The
   * Feed is the surface that drives HLS itself.
   */
  const directFile = isDirectVideoUrl(media.src);

  return {
    id: card.id,
    reportId: report.id,
    embedUrl: directFile ? media.src : embedUrl,
    playbackUrl: media.src,
    thumbnailUrl: media.poster,
    // The animated webp preview is the cheap in-view teaser; a stored file has
    // none, so it stands in for itself.
    previewUrl: directFile ? media.src : card.preview_url,
    durationSeconds: card.duration_seconds,
    headline,
    ticker,
    direction: report.prediction?.direction ?? null,
    access: report.access,
    price: report.price,
    analyst: {
      id: author?.id ?? null,
      handle: author?.handle ?? "",
      displayName: author?.display_name ?? "Analyst",
      avatarUrl: author?.avatar_url ?? null,
      score: author?.score || null,
      sampleSize: author?.sample_size,
    },
    disclosure: {
      positionHeld: report.position_held,
      compensationTied: report.compensation_tied,
    },
  };
}
