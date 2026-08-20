import { createPublicClient } from "@/lib/supabase/public";
import { cachedPage } from "@/lib/cache/page";

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
}

/**
 * The live activity line for the landing page, from real rows since the
 * start of the New York calendar day. Zeroes are zeroes; nothing is padded.
 */
export async function getTodayActivity(): Promise<TodayActivity> {
  const nyDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  return cachedPage(`today-activity:${nyDate}`, 60, loadTodayActivity);
}

async function loadTodayActivity(): Promise<TodayActivity> {
  const empty = { publicationsToday: 0, analystsToday: 0, callsResolvedToday: 0 };
  try {
    const supabase = createPublicClient();
    const nyDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const dayStart = new Date(`${nyDate}T04:00:00Z`).toISOString();
    const { data, error } = await supabase.rpc("today_activity", { p_since: dayStart });
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
        .gte("published_at", dayStart)
        .limit(2000),
      supabase.from("predictions").select("id").neq("outcome", "open").gte("resolves_at", dayStart).limit(2000),
    ]);
    const rows = (pubs as { author_id: string }[]) ?? [];
    return {
      publicationsToday: rows.length,
      analystsToday: new Set(rows.map((r) => r.author_id)).size,
      callsResolvedToday: ((resolved as { id: string }[]) ?? []).length,
    };
  } catch {
    return empty;
  }
}
