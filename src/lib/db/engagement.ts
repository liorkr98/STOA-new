import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Engagement events (backend brief item 4). Write-only from the app: nothing on
 * a request path reads this table. Inserts go through the session client so RLS
 * enforces "your own or anonymous"; a batch is one multi-row INSERT.
 */

export const ENGAGEMENT_KINDS = [
  "impression",
  "play",
  "watch_progress",
  "swipe_depth",
  "cta_reach",
  "unlock",
  "subscribe",
  "follow_from_surface",
] as const;

export type EngagementKind = (typeof ENGAGEMENT_KINDS)[number];

export interface EngagementEventInput {
  reportId: string;
  kind: EngagementKind;
  value?: number | null;
  surface?: string | null;
}

/** Max rows accepted in one batch, so a bad client cannot post megabytes. */
export const ENGAGEMENT_BATCH_LIMIT = 100;

export async function recordEngagementEvents(
  events: EngagementEventInput[],
): Promise<{ ok: boolean; inserted: number }> {
  if (events.length === 0) return { ok: true, inserted: 0 };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rows = events.slice(0, ENGAGEMENT_BATCH_LIMIT).map((e) => ({
    actor_id: user?.id ?? null,
    report_id: e.reportId,
    kind: e.kind,
    value: e.value ?? null,
    surface: e.surface ?? null,
  }));

  const { error } = await supabase.from("engagement_events").insert(rows);
  if (error) return { ok: false, inserted: 0 };
  return { ok: true, inserted: rows.length };
}
