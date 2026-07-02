import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/db/platform-stats";

export const dynamic = "force-dynamic";

/**
 * Homepage trust-bar aggregates from the platform_stats materialized view.
 * Refreshed nightly by the grading cron — never live count(*) on every hit.
 */
export async function GET() {
  const stats = await getPlatformStats();

  if (!stats) {
    return NextResponse.json(
      {
        reports_fact_checked: null,
        locked_calls_tracked: null,
        claims_verified_pct: null,
        refreshed_at: null,
      },
      {
        headers: { "Cache-Control": "public, max-age=3600" },
      },
    );
  }

  return NextResponse.json(
    {
      reports_fact_checked: Number(stats.fact_checked_claims),
      locked_calls_tracked: Number(stats.locked_calls_tracked),
      claims_verified_pct:
        stats.claims_verified_pct != null ? Number(stats.claims_verified_pct) : null,
      refreshed_at: stats.refreshed_at,
    },
    {
      headers: { "Cache-Control": "public, max-age=3600" },
    },
  );
}
