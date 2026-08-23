import "server-only";

import { getSessionProfile, getSessionUserId } from "@/lib/db/auth";
import { listDismissedReportIds } from "@/lib/db/feed-dismissals";
import { listInstrumentFollowsByKind } from "@/lib/db/follows-instruments";
import { followedAnalystIds } from "@/lib/db/social";
import type { ViewerContext } from "./types";

export function emptyViewerContext(now = Date.now()): ViewerContext {
  return {
    followedAnalystIds: new Set(),
    watchlistTickers: new Set(),
    sectorInterests: new Set(),
    dismissedReportIds: new Set(),
    now,
  };
}

export async function loadViewerContext(): Promise<ViewerContext> {
  const userId = await getSessionUserId();
  if (!userId) return emptyViewerContext();

  const [profile, followed, instruments, dismissed] = await Promise.all([
    getSessionProfile(),
    followedAnalystIds(userId),
    listInstrumentFollowsByKind(),
    listDismissedReportIds(userId),
  ]);

  const sectorInterests = new Set<string>();
  for (const s of profile?.profile_config?.interests ?? []) sectorInterests.add(s.toLowerCase());
  for (const s of instruments.sector) sectorInterests.add(s.toLowerCase());
  for (const s of instruments.theme) sectorInterests.add(s.toLowerCase());

  const watchlistTickers = new Set<string>();
  for (const t of instruments.ticker) watchlistTickers.add(t.toUpperCase());
  for (const t of instruments.etf) watchlistTickers.add(t.toUpperCase());

  return {
    followedAnalystIds: new Set(followed),
    watchlistTickers,
    sectorInterests,
    dismissedReportIds: new Set(dismissed),
    now: Date.now(),
  };
}
