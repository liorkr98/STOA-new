import "server-only";
import { bunnyEmbedUrl } from "@/lib/video/bunny";
import { listTickerRows } from "@/lib/db/tickers";
import { storyDek, storyHeadline } from "@/lib/dispatch/ranking";
import { medianRate, publicationAttention, stageFor, visibleStageMarker, type AttentionSample } from "@/lib/lifecycle/stages";
import type { VideoClipCard } from "@/lib/db/video-clips";
import type { Report } from "@/lib/types";
import type { FeedCard, FeedPublication } from "@/lib/feed/types";

/**
 * Server-side mapper from published video clips (with their joined report,
 * author and prediction) to the Feed player's publication shape. The Bunny
 * embed URL is built here so no provider/env code reaches the browser.
 *
 * Evidence cards are not stored per publication yet, so a live publication's
 * stack is the deck as its case card plus the unlock/read card.
 * CARDS_PLACEHOLDER: replace with stored cards once the Card Engine persists.
 */

function typeLabel(t: Report["type"]): FeedPublication["typeLabel"] {
  return t === "research" ? "RESEARCH" : t === "short_post" ? "NOTE" : "CALL";
}

export function contentBadgeFor(report: Report, hasVideo: boolean): string {
  const parts: string[] = [];
  if (hasVideo) parts.push("VIDEO");
  if (report.prediction) parts.push("CALL");
  if (report.type === "research" || (report.body?.length ?? 0) > 600) parts.push("THESIS");
  return parts.length ? parts.join(" · ") : "NOTE";
}

function defaultCards(report: Report): FeedCard[] {
  const cards: FeedCard[] = [];
  const deck = report.summary?.trim();
  if (deck) cards.push({ kind: "thesis", id: `${report.id}-case`, locked: false, title: storyHeadline(report), body: deck });
  const access = report.access === "paid" ? "paid" : report.access === "subscribers" ? "subscribers" : "free";
  cards.push({
    kind: "unlock",
    id: `${report.id}-unlock`,
    locked: false,
    access,
    price: report.price != null ? `$${report.price}` : null,
  });
  return cards;
}

export async function clipsToPublications(clips: VideoClipCard[], now = Date.now()): Promise<FeedPublication[]> {
  const usable = clips.filter((c) => c.report && c.report.author);
  const symbols = [
    ...new Set(usable.map((c) => (c.report!.prediction?.ticker ?? c.report!.ticker)?.toUpperCase()).filter((s): s is string => Boolean(s))),
  ];
  const sectorByTicker = new Map<string, string | null>();
  for (const row of symbols.length ? await listTickerRows(symbols) : []) sectorByTicker.set(row.symbol.toUpperCase(), row.sector);

  const samples = new Map<string, AttentionSample>();
  for (const c of usable) {
    const r = c.report!;
    samples.set(r.id, {
      since: r.published_at ?? r.created_at,
      total: publicationAttention({ views: r.views ?? 0, likes: r.likes ?? 0, comments: r.comment_count ?? 0 }),
    });
  }
  const median = medianRate([...samples.values()], now);

  return usable.map((c) => {
    const r = c.report!;
    let embedUrl: string | null = null;
    try {
      embedUrl = bunnyEmbedUrl(c.bunny_video_guid, { autoplay: true, muted: true });
    } catch {
      embedUrl = c.playback_url || null;
    }
    const hasCall = Boolean(r.prediction);
    const sym = (r.prediction?.ticker ?? r.ticker)?.toUpperCase() ?? null;
    const sector = sym ? sectorByTicker.get(sym) ?? null : null;
    const p = r.prediction;
    const resolved = p && ["hit", "near", "miss", "partial"].includes(p.outcome) && p.resolved_price != null;
    return {
      id: r.id,
      clipId: c.id,
      embedUrl,
      thumbnailUrl: c.thumbnail_url,
      durationSeconds: c.duration_seconds,
      headline: storyHeadline(r),
      deck: storyDek(r),
      typeLabel: typeLabel(r.type),
      ticker: hasCall ? sym : null,
      direction: hasCall ? (p?.direction ?? null) : null,
      // THEME_TAG_PLACEHOLDER: the ticker's sector stands in for a stored theme.
      themeTag: !hasCall && sector ? sector.toUpperCase() : null,
      sector,
      contentBadge: contentBadgeFor(r, true),
      stageMarker: visibleStageMarker(stageFor(samples.get(r.id)!, "publication", median, now)),
      analyst: { handle: r.author!.handle, displayName: r.author!.display_name, avatarUrl: r.author!.avatar_url },
      seal: resolved
        ? { status: p.outcome === "hit" ? "hit" : p.outcome === "near" ? "near" : "miss", dateISO: p.resolution_trading_date ?? p.resolves_at }
        : null,
      access: r.access === "paid" ? "paid" : r.access === "subscribers" ? "subscribers" : "free",
      price: r.price,
      cards: defaultCards(r),
      comments: [],
      publishedAt: r.published_at ?? r.created_at,
    };
  });
}
