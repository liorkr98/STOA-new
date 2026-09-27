"use server";

import { getSessionUserId } from "@/lib/db/auth";
import { listPublishedByAuthors } from "@/lib/db/reports";
import { listReadyClipsForReports } from "@/lib/db/video-clips";
import { attachViewerSocial, reportsToPublications } from "@/lib/feed/build-publications";
import type { FeedPublication } from "@/lib/feed/types";

/** How far back an analyst's recent work reaches, counted from their newest piece. */
const RECENT_SPAN_MS = 7 * 24 * 3_600_000;
/** The most any one face holds, so a prolific week is still a short watch. */
const PER_FACE = 6;
const MAX_FACES = 16;

/**
 * The recent work of the analysts in Today's faces row, newest first, in the
 * Feed player's shape, keyed by analyst. Video and written pieces alike: a
 * face who posted only prose still opens, as pages to read.
 *
 * Streaming is account-gated everywhere the Feed player runs, so a signed-out
 * reader gets each clip as its poster and a way to sign in rather than the
 * stream itself.
 */
export async function loadFaceStories(analystIds: string[]): Promise<Record<string, FeedPublication[]>> {
  const ids = [...new Set(analystIds)].slice(0, MAX_FACES);
  if (ids.length === 0) return {};
  const [reports, userId] = await Promise.all([
    listPublishedByAuthors(ids, ids.length * PER_FACE * 2),
    getSessionUserId(),
  ]);

  const kept = new Map<string, typeof reports>();
  for (const r of reports) {
    const mine = kept.get(r.author_id) ?? [];
    if (mine.length >= PER_FACE) continue;
    const newest = mine[0];
    const at = Date.parse(r.published_at ?? r.created_at);
    if (newest && Date.parse(newest.published_at ?? newest.created_at) - at > RECENT_SPAN_MS) continue;
    mine.push(r);
    kept.set(r.author_id, mine);
  }
  const chosen = [...kept.values()].flat();
  const clips = await listReadyClipsForReports(chosen.map((r) => r.id));
  const built = await attachViewerSocial(await reportsToPublications(chosen, clips), userId);

  const out: Record<string, FeedPublication[]> = {};
  for (const pub of built) {
    const shown = userId || !pub.clipId ? pub : gate(pub);
    (out[pub.analyst.id] ??= []).push(shown);
  }
  return out;
}

function gate(pub: FeedPublication): FeedPublication {
  return { ...pub, clipId: null, embedUrl: null, playbackUrl: null, captionUrl: null, watchGated: true };
}
