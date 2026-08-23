import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { RankingSurface } from "@/lib/ranking/types";

export interface RankingImpressionRow {
  videoId: string;
  reportId: string;
  analystId: string;
  position: number;
  score: number;
  reasons: string[];
  wasExplorationSlot?: boolean;
}

/** Fire-and-forget from the ranked page. Failures never fail the request. */
export async function recordRankingImpressions(input: {
  sessionId: string;
  userId: string | null;
  surface: RankingSurface;
  rows: RankingImpressionRow[];
}): Promise<void> {
  if (input.rows.length === 0) return;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("ranking_impressions").insert(
      input.rows.map((r) => ({
        user_id: input.userId,
        session_id: input.sessionId,
        surface: input.surface,
        video_id: r.videoId,
        report_id: r.reportId,
        analyst_id: r.analystId,
        position_in_feed: r.position,
        was_exploration_slot: r.wasExplorationSlot ?? false,
        score: r.score,
        reasons: r.reasons,
      })),
    );
    if (error) console.error("ranking_impressions insert failed", error.message);
  } catch (err) {
    console.error("ranking_impressions insert failed", err);
  }
}
