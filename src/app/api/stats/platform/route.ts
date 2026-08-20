import { NextResponse } from "next/server";
import { getPlatformStats } from "@/lib/db/platform-stats";
import { withHandler } from "@/lib/http/handler";
import { withCache } from "@/lib/cache";
import { cacheKeys } from "@/lib/cache/keys";

export const dynamic = "force-dynamic";

/**
 * Homepage trust-bar aggregates from the platform_stats materialized view.
 * Refreshed nightly by the grading cron — never live count(*) on every hit.
 */
async function handleStats() {
  const stats = await withCache(cacheKeys.platformStats(), 60, () => getPlatformStats());

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

export const GET = withHandler(
  {
    route: "GET /api/stats/platform",
    auth: "none",
    rateLimit: { name: "stats-platform", limit: 120, windowSeconds: 60, by: "ip" },
  },
  () => handleStats(),
);
