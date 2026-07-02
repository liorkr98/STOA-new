import { createClient } from "@/lib/supabase/server";

export interface PlatformStats {
  fact_checked_claims: number;
  locked_calls_tracked: number;
  claims_verified_pct: number | null;
  refreshed_at: string | null;
}

export async function getPlatformStats(): Promise<PlatformStats | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_stats")
      .select("fact_checked_claims, locked_calls_tracked, claims_verified_pct, refreshed_at")
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return (data as PlatformStats | null) ?? null;
  } catch {
    return null;
  }
}
