import "server-only";

import { listRecentPublished } from "@/lib/db/reports";
import { listAnalystsByFollowers } from "@/lib/db/profiles";
import { listRecentResolvedWithReports } from "@/lib/db/predictions";
import { listVideoClipCards } from "@/lib/db/video-clips";
import { listTickerRows } from "@/lib/db/tickers";
import { getTodayActivity, type TodayActivity } from "@/lib/db/platform-stats";
import { bunnyEmbedUrl } from "@/lib/video/bunny";
import { storyHeadline } from "@/lib/dispatch/ranking";
import { getCycleWindow } from "@/lib/dispatch/cycle";
import { getIssueNumber } from "@/lib/dispatch/issue-number";
import { cachedPage } from "@/lib/cache/page";
import { attentionRate, publicationAttention } from "@/lib/lifecycle/stages";
import type { TapeQuote } from "@/lib/markets/types";
import type { TodayVerdict } from "@/lib/today/types";
import type { Direction } from "@/lib/types";

/**
 * The signed-out landing, built from what is popular platform-wide. Nothing
 * personal, nothing invented: a section with no data collapses. Headlines and
 * previews only, never a deck or a readable thesis.
 */

export interface LandingHeadline {
  reportId: string;
  kicker: string;
  headline: string;
  analyst: string;
  ticker: string | null;
  direction: Direction | null;
}

export interface LandingLead extends LandingHeadline {
  /** Muted, looping autoplay embed when a ready clip exists; null renders no fake video. */
  embedUrl: string | null;
  thumbnailUrl: string | null;
  /** The analyst's id, so the placeholder thumbnail can take their colour. */
  analystId: string | null;
}

export interface LandingFace {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  specialty: string;
}

export interface LandingPayload {
  activity: TodayActivity;
  tape: TapeQuote[];
  issue: { issueNumber: number; dateISO: string };
  lead: LandingLead | null;
  headlines: LandingHeadline[];
  verdicts: TodayVerdict[];
  faces: LandingFace[];
}

export async function buildLanding(): Promise<LandingPayload> {
  return cachedPage("landing", 30, buildLandingUncached);
}

async function buildLandingUncached(): Promise<LandingPayload> {
  const now = Date.now();
  const cycle = getCycleWindow();
  const [pool, clips, analysts, resolved, activity, issueNumber] = await Promise.all([
    listRecentPublished(80).catch(() => []),
    listVideoClipCards(80).catch(() => []),
    listAnalystsByFollowers(30).catch(() => []),
    listRecentResolvedWithReports(40).catch(() => []),
    getTodayActivity(),
    getIssueNumber(cycle.dateIso),
  ]);

  const symbols = [...new Set(pool.map((r) => (r.prediction?.ticker ?? r.ticker)?.toUpperCase()).filter((s): s is string => Boolean(s)))];
  const sectorByTicker = new Map<string, string | null>();
  for (const row of symbols.length ? await listTickerRows(symbols).catch(() => []) : []) sectorByTicker.set(row.symbol.toUpperCase(), row.sector);
  const clipByReport = new Map(clips.map((c) => [c.report_id, c] as const));

  // Popular platform-wide: attention rate, then recency.
  const ranked = [...pool]
    .filter((r) => r.author)
    .map((r) => ({
      r,
      rate: attentionRate(
        { since: r.published_at ?? r.created_at, total: publicationAttention({ views: r.views ?? 0, likes: r.likes ?? 0, comments: r.comment_count ?? 0 }) },
        now,
      ),
    }))
    .sort((a, b) => b.rate - a.rate)
    .map((x) => x.r);

  const toHeadline = (r: (typeof ranked)[number]): LandingHeadline => {
    const hasCall = Boolean(r.prediction);
    const sym = (r.prediction?.ticker ?? r.ticker)?.toUpperCase() ?? null;
    const sector = sym ? sectorByTicker.get(sym) : null;
    return {
      reportId: r.id,
      kicker: (sector ?? sym ?? (r.type === "short_post" ? "Note" : "Research")).toUpperCase(),
      headline: storyHeadline(r),
      analyst: r.author!.display_name,
      ticker: hasCall ? sym : null,
      direction: hasCall ? (r.prediction?.direction ?? null) : null,
    };
  };

  const leadReport = ranked.find((r) => clipByReport.has(r.id)) ?? ranked[0] ?? null;
  let lead: LandingLead | null = null;
  if (leadReport) {
    const clip = clipByReport.get(leadReport.id);
    let embedUrl: string | null = null;
    if (clip) {
      try {
        embedUrl = bunnyEmbedUrl(clip.bunny_video_guid, { autoplay: true, muted: true, loop: true });
      } catch {
        embedUrl = null;
      }
    }
    lead = {
      ...toHeadline(leadReport),
      embedUrl,
      thumbnailUrl: clip?.thumbnail_url ?? null,
      analystId: leadReport.author?.id ?? null,
    };
  }
  const headlines = ranked.filter((r) => r.id !== leadReport?.id).slice(0, 4).map(toHeadline);

  // Five resolved calls, most popular first, with at least one MISS when one exists.
  const verdictsAll: TodayVerdict[] = resolved.map((p) => ({
    reportId: p.report!.id,
    ticker: p.ticker.toUpperCase(),
    direction: p.direction,
    outcome: p.outcome as TodayVerdict["outcome"],
    headline: p.report!.title?.trim() || p.report!.summary?.trim() || `${p.ticker.toUpperCase()} call`,
    entryPrice: p.lock_price,
    exitPrice: p.resolved_price,
    returnPct: p.return_pct,
    resolvedAt: p.resolution_trading_date ?? p.resolves_at,
    author: { id: p.author!.id, handle: p.author!.handle, displayName: p.author!.display_name, avatarUrl: p.author!.avatar_url },
  }));
  let verdicts = verdictsAll.slice(0, 5);
  if (!verdicts.some((v) => v.outcome === "miss")) {
    const miss = verdictsAll.find((v) => v.outcome === "miss");
    if (miss) verdicts = [...verdicts.slice(0, 4), miss];
  }

  const faces: LandingFace[] = analysts.map((a) => ({
    handle: a.handle,
    displayName: a.display_name,
    avatarUrl: a.avatar_url,
    specialty: a.headline?.trim() || "Independent analyst",
  }));

  return {
    activity,
    tape: [],
    issue: { issueNumber, dateISO: cycle.dateIso },
    lead,
    headlines,
    verdicts,
    faces,
  };
}
