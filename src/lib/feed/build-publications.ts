import "server-only";
import { bunnyEmbedUrl } from "@/lib/video/bunny";
import { listTickerRows } from "@/lib/db/tickers";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { medianRate, publicationAttention, stageFor, visibleStageMarker, type AttentionSample } from "@/lib/lifecycle/stages";
import { themeLabel } from "@/lib/tags/taxonomy";
import { listCardsForReports } from "@/lib/db/publication-cards";
import type { VideoClipCard } from "@/lib/db/video-clips";
import type { Report } from "@/lib/types";
import type { FeedCard, FeedPublication } from "@/lib/feed/types";
import { publicTypeLabel } from "@/lib/compose/modes";
import { resolveClipPlayback } from "@/lib/demo/clips";
import { isDirectVideoUrl } from "@/lib/video/direct";

/**
 * Server-side mapper from published video clips (with their joined report,
 * author and prediction) to the Feed player's publication shape. The Bunny
 * embed URL is built here so no provider/env code reaches the browser.
 *
 * Evidence cards come from `publication_cards` when the creator has built a
 * stack; otherwise the stack is the deck as a case card plus the unlock card.
 * Locked cards are filtered by RLS and stripped of their payload server-side, so
 * gated prose and numbers never reach the browser.
 */

function typeLabel(t: Report["type"]): FeedPublication["typeLabel"] {
  return publicTypeLabel(t);
}

export function contentBadgeFor(report: Report, hasVideo: boolean): string {
  const parts: string[] = [];
  if (hasVideo) parts.push("VIDEO");
  if (report.prediction) parts.push("CALL");
  if (report.type === "research" || (report.body?.length ?? 0) > 600) parts.push("THESIS");
  return parts.length ? parts.join(" · ") : "NOTE";
}

function unlockCard(report: Report): FeedCard {
  const access = report.access === "paid" ? "paid" : report.access === "subscribers" ? "subscribers" : "free";
  return {
    kind: "unlock",
    id: `${report.id}-unlock`,
    locked: false,
    access,
    price: report.price != null ? `$${report.price}` : null,
  };
}

/**
 * The stack for a publication with no stored cards: the deck as its case card
 * plus the read/unlock card. Kept as the fallback so publications written before
 * the Card Engine still render a coherent stack.
 */
function defaultCards(report: Report): FeedCard[] {
  const cards: FeedCard[] = [];
  const deck = report.summary?.trim();
  if (deck) cards.push({ kind: "thesis", id: `${report.id}-case`, locked: false, title: storyHeadline(report), body: deck });
  cards.push(unlockCard(report));
  return cards;
}

/**
 * Stored cards win when present. The unlock card is appended here rather than
 * stored, so its price and access always reflect the report's current terms.
 */
function cardsFor(report: Report, stored: FeedCard[] | undefined, ticker: string | null): FeedCard[] {
  const base =
    !stored || stored.length === 0
      ? defaultCards(report)
      : [...stored.filter((c) => c.kind !== "unlock"), unlockCard(report)];
  if (!ticker || base.some((c) => c.kind === "figure")) return base;
  const tape: FeedCard = {
    kind: "figure",
    id: `${report.id}-tape`,
    locked: false,
    caption: `${ticker} · last 30 sessions`,
    imageUrl: null,
    source: "auto",
  };
  const insertAt = Math.min(1, Math.max(0, base.length - 1));
  return [...base.slice(0, insertAt), tape, ...base.slice(insertAt)];
}

export async function clipsToPublications(clips: VideoClipCard[], now = Date.now()): Promise<FeedPublication[]> {
  const usable = clips.filter((c) => c.report && c.report.author);
  const symbols = [
    ...new Set(usable.map((c) => (c.report!.prediction?.ticker ?? c.report!.ticker)?.toUpperCase()).filter((s): s is string => Boolean(s))),
  ];
  const sectorByTicker = new Map<string, string | null>();
  for (const row of symbols.length ? await listTickerRows(symbols) : []) sectorByTicker.set(row.symbol.toUpperCase(), row.sector);

  // One query for every publication's stack. RLS drops locked cards the reader
  // is not entitled to, and the mapper strips any locked payload that remains.
  const cardsByReport = await listCardsForReports(usable.map((c) => c.report!.id));

  const samples = new Map<string, AttentionSample>();
  for (const c of usable) {
    const r = c.report!;
    samples.set(r.id, {
      since: r.published_at ?? r.created_at,
      total: publicationAttention({ views: r.views ?? 0, likes: r.likes ?? 0, comments: r.comment_count ?? 0 }),
    });
  }
  const median = medianRate([...samples.values()], now);

  return usable.map((c, index) => {
    const r = c.report!;
    const media = resolveClipPlayback({
      playbackUrl: c.playback_url,
      thumbnailUrl: c.thumbnail_url,
      index,
    });
    const native = isDirectVideoUrl(media.src);
    let embedUrl: string | null = null;
    if (!native) {
      try {
        embedUrl = bunnyEmbedUrl(c.bunny_video_guid, { autoplay: true, muted: true, chrome: false });
      } catch {
        embedUrl = c.playback_url || null;
      }
    }
    const hasCall = Boolean(r.prediction);
    const preview = r.feed_preview_seconds ?? null;
    const duration = preview && preview > 0 ? Math.min(c.duration_seconds, preview) : c.duration_seconds;
    const sym = (r.prediction?.ticker ?? r.ticker)?.toUpperCase() ?? null;
    const sector = sym ? sectorByTicker.get(sym) ?? null : null;
    const p = r.prediction;
    const resolved = p && ["hit", "near", "miss", "partial"].includes(p.outcome) && p.resolved_price != null;
    return {
      id: r.id,
      clipId: c.id,
      embedUrl,
      playbackUrl: native ? media.src : null,
      thumbnailUrl: media.poster,
      durationSeconds: duration,
      feedPreviewSeconds: preview,
      headline: storyHeadline(r),
      deck: storyDek(r),
      typeLabel: typeLabel(r.type),
      ticker: hasCall ? sym : null,
      direction: hasCall ? (p?.direction ?? null) : null,
      // Callless items anchor on the publication's own theme tag; the ticker's
      // sector is the fallback for rows published before tags existed.
      themeTag: hasCall ? null : themeLabel(r, sector),
      sector,
      contentBadge: contentBadgeFor(r, true),
      stageMarker: visibleStageMarker(stageFor(samples.get(r.id)!, "publication", median, now)),
      analyst: { id: r.author!.id, handle: r.author!.handle, displayName: r.author!.display_name, avatarUrl: r.author!.avatar_url },
      seal: resolved
        ? { status: p.outcome === "hit" ? "hit" : p.outcome === "near" ? "near" : "miss", dateISO: p.resolution_trading_date ?? p.resolves_at }
        : null,
      access: r.access === "paid" ? "paid" : r.access === "subscribers" ? "subscribers" : "free",
      price: r.price,
      cards: cardsFor(r, cardsByReport.get(r.id), hasCall ? sym : null),
      comments: [],
      publishedAt: r.published_at ?? r.created_at,
    };
  });
}
