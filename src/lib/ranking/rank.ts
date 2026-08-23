import "server-only";

import { listTickerRows } from "@/lib/db/tickers";
import type { VideoClipCard } from "@/lib/db/video-clips";
import { diversify } from "./rerank";
import { scoreItem } from "./score";
import type { RankingSignals, RankingSurface, ScoredClip, ViewerContext } from "./types";

function signalsFromClip(clip: VideoClipCard, sectorByTicker: Map<string, string | null>): RankingSignals {
  const r = clip.report!;
  const ticker = (r.prediction?.ticker ?? r.ticker)?.toUpperCase() ?? null;
  const tags = [r.primary_tag, r.theme_tag, ...(r.secondary_tags ?? [])].filter((t): t is string => Boolean(t));
  return {
    views: r.views ?? 0,
    likes: r.likes ?? 0,
    comments: r.comment_count ?? 0,
    playCount: clip.play_count ?? 0,
    completionCount: clip.completion_count ?? 0,
    clickThroughCount: clip.click_through_count ?? 0,
    saveCount: 0,
    shareCount: 0,
    publishedAt: clip.published_at ?? r.published_at ?? r.created_at,
    moatScore: r.author?.score ?? 0,
    ticker,
    sector: ticker ? (sectorByTicker.get(ticker) ?? null) : null,
    tags,
    analystId: r.author_id,
    outcome: r.prediction?.outcome ?? null,
  };
}

export async function rankClips(
  clips: VideoClipCard[],
  ctx: ViewerContext,
  surface: RankingSurface,
): Promise<ScoredClip<VideoClipCard>[]> {
  const pool = clips.filter(
    (c) => c.report && c.report.author && !ctx.dismissedReportIds.has(c.report.id),
  );
  const symbols = [
    ...new Set(
      pool
        .map((c) => (c.report!.prediction?.ticker ?? c.report!.ticker)?.toUpperCase())
        .filter((s): s is string => Boolean(s)),
    ),
  ];
  const sectorByTicker = new Map<string, string | null>();
  for (const row of symbols.length ? await listTickerRows(symbols) : []) {
    sectorByTicker.set(row.symbol.toUpperCase(), row.sector);
  }

  const scored: ScoredClip<VideoClipCard>[] = pool.map((clip) => {
    const signals = signalsFromClip(clip, sectorByTicker);
    const result = scoreItem(signals, ctx, surface);
    return {
      item: clip,
      analystId: signals.analystId,
      reportId: clip.report_id,
      videoId: clip.id,
      score: result.score,
      reasons: result.reasons,
      parts: result.parts,
    };
  });

  scored.sort((a, b) => {
    const delta = b.score - a.score;
    if (delta !== 0) return delta;
    const aAt = Date.parse(a.item.published_at ?? a.item.created_at);
    const bAt = Date.parse(b.item.published_at ?? b.item.created_at);
    return bAt - aAt;
  });

  return diversify(scored);
}
