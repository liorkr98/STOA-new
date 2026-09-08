import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface PlatformStats {
  fact_checked_claims: number;
  locked_calls_tracked: number;
  claims_verified_pct: number | null;
  refreshed_at: string | null;
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  try {
    return await cachedPage("platform-stats", 60, async () => {
      const supabase = createPublicClient();
      const { data, error } = await supabase
        .from("platform_stats")
        .select("fact_checked_claims, locked_calls_tracked, claims_verified_pct, refreshed_at")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as PlatformStats | null) ?? null;
    });
  } catch {
    return null;
  }
}

export interface TodayActivity {
  publicationsToday: number;
  analystsToday: number;
  callsResolvedToday: number;
  /** Quiet NY days fall back to the last seven days so the landing never prints three zeros. */
  window: "today" | "week";
}

/**
 * The live activity line for the landing page. Prefers the New York calendar
 * day; if that day is empty, uses the last seven days instead.
 */
export async function getTodayActivity(): Promise<TodayActivity> {
  const nyDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return cachedPage(`today-activity:${nyDate}`, 60, loadTodayActivity);
}

function emptyActivity(): TodayActivity {
  return { publicationsToday: 0, analystsToday: 0, callsResolvedToday: 0, window: "today" };
}

function isQuiet(a: { publicationsToday: number; analystsToday: number; callsResolvedToday: number }) {
  return a.publicationsToday === 0 && a.analystsToday === 0 && a.callsResolvedToday === 0;
}

async function queryActivity(
  supabase: SupabaseClient,
  since: string,
): Promise<{ publicationsToday: number; analystsToday: number; callsResolvedToday: number } | null> {
  const { data, error } = await supabase.rpc("today_activity", { p_since: since });
  const row = Array.isArray(data) ? data[0] : data;
  if (!error && row && typeof row === "object") {
    const r = row as { publications: number; analysts: number; resolved: number };
    return {
      publicationsToday: Number(r.publications) || 0,
      analystsToday: Number(r.analysts) || 0,
      callsResolvedToday: Number(r.resolved) || 0,
    };
  }

  const [{ data: pubs }, { data: resolved }] = await Promise.all([
    supabase
      .from("reports")
      .select("author_id")
      .in("status", ["published", "resolution_pending_review"])
      .gte("published_at", since)
      .limit(2000),
    supabase.from("predictions").select("id").neq("outcome", "open").gte("resolves_at", since).limit(2000),
  ]);
  const rows = (pubs as { author_id: string }[]) ?? [];
  return {
    publicationsToday: rows.length,
    analystsToday: new Set(rows.map((r) => r.author_id)).size,
    callsResolvedToday: ((resolved as { id: string }[]) ?? []).length,
  };
}

async function loadTodayActivity(): Promise<TodayActivity> {
  try {
    const supabase = createPublicClient();
    const nyDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const dayStart = new Date(`${nyDate}T04:00:00Z`).toISOString();
    const today = await queryActivity(supabase, dayStart);
    if (today && !isQuiet(today)) return { ...today, window: "today" };

    const weekStart = new Date(Date.parse(dayStart) - 7 * 86_400_000).toISOString();
    const week = await queryActivity(supabase, weekStart);
    if (week && !isQuiet(week)) return { ...week, window: "week" };
    return emptyActivity();
  } catch {
    return emptyActivity();
  }
}
