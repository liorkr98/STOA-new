import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** How far back a reader's own history counts towards what Today fits to them. */
const HISTORY_DAYS = 60;
const HISTORY_ROWS = 300;

/**
 * The publications this reader has spent time on, newest first: clips they
 * played or watched on any surface, and pieces they liked, saved or bought.
 * Opening a written piece is not recorded anywhere, so reading counts only
 * through those three.
 *
 * Read with the service key and always filtered to the one reader: the view
 * and engagement tables have no policy that lets a reader see their own rows.
 * Any failure returns an empty history, which Today treats as a new reader.
 */
export async function engagedReportIds(userId: string): Promise<string[]> {
  try {
    const admin = createAdminClient();
    const since = new Date(Date.now() - HISTORY_DAYS * 86_400_000).toISOString();

    const [events, views, likes, saves, unlocks] = await Promise.all([
      admin
        .from("engagement_events")
        .select("report_id, created_at")
        .eq("actor_id", userId)
        .in("kind", ["play", "watch_progress", "unlock"])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(HISTORY_ROWS),
      admin
        .from("video_view_events")
        .select("video_id, created_at")
        .eq("viewer_id", userId)
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(HISTORY_ROWS),
      admin.from("likes").select("report_id, created_at").eq("user_id", userId).limit(HISTORY_ROWS),
      admin.from("saved_reports").select("report_id, created_at").eq("user_id", userId).limit(HISTORY_ROWS),
      admin.from("report_unlocks").select("report_id, created_at").eq("user_id", userId).limit(HISTORY_ROWS),
    ]);

    const videoIds = [...new Set((views.data ?? []).map((v) => v.video_id as string))];
    const clipReport = new Map<string, string>();
    if (videoIds.length) {
      const { data } = await admin.from("video_clips").select("id, report_id").in("id", videoIds);
      for (const c of data ?? []) clipReport.set(c.id as string, c.report_id as string);
    }

    const stamped: { id: string; at: string }[] = [];
    const add = (rows: { report_id?: unknown; created_at?: unknown }[] | null) => {
      for (const r of rows ?? []) {
        if (typeof r.report_id === "string") stamped.push({ id: r.report_id, at: String(r.created_at ?? "") });
      }
    };
    add(events.data);
    add(likes.data);
    add(saves.data);
    add(unlocks.data);
    for (const v of views.data ?? []) {
      const id = clipReport.get(v.video_id as string);
      if (id) stamped.push({ id, at: String(v.created_at ?? "") });
    }

    stamped.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
    return [...new Set(stamped.map((s) => s.id))];
  } catch {
    return [];
  }
}
