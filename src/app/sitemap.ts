import type { MetadataRoute } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo/site";
import { UNIVERSE } from "@/lib/universe";
import { allTickerCoverage } from "@/lib/seo/ticker-coverage";

export const revalidate = 3600;

/**
 * Coverage-count tiering, deliberately not a full scoring formula -- the
 * spec calling for this explicitly says a simple tier is enough here. A
 * ticker with more analyst coverage ranks slightly higher; that's the whole
 * signal, nothing MOAT/Track-Score-weighted layered on top.
 */
function priorityForCoverage(count: number): number {
  if (count >= 10) return 0.9;
  if (count >= 3) return 0.7;
  return 0.5;
}

async function reportRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("reports")
      .select("id, locked_at")
      .eq("status", "published")
      .not("locked_at", "is", null)
      .order("locked_at", { ascending: false })
      .limit(5000);
    return ((data as { id: string; locked_at: string }[]) ?? []).map((r) => ({
      url: `${SITE_URL}/report/${r.id}`,
      lastModified: r.locked_at,
      // A locked report is immutable by design (trust_compliance trigger) --
      // 'never' is a correct, deliberate signal of permanence, not the
      // library default left unset.
      changeFrequency: "never" as const,
      priority: 0.6,
    }));
  } catch {
    return [];
  }
}

async function tickerRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const coverage = await allTickerCoverage();
    return UNIVERSE
      // Task 5 guard: a ticker page with zero published reports is thin
      // content and stays out of both the index (see generateMetadata in
      // markets/[ticker]/page.tsx) and the sitemap -- same count query, one
      // place, so the two can't disagree.
      .filter((u) => (coverage[u.ticker] ?? 0) > 0)
      .map((u) => ({
        url: `${SITE_URL}/markets/${u.ticker}`,
        changeFrequency: "daily" as const,
        priority: priorityForCoverage(coverage[u.ticker]),
      }));
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/discover`, changeFrequency: "hourly", priority: 0.8 },
    { url: `${SITE_URL}/markets`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/leaderboard`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE_URL}/how-it-works`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/pricing`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${SITE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/terms/creators`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/cookies`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/subprocessors`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/not-advice`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/accessibility`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE_URL}/compliance-brief`, changeFrequency: "yearly", priority: 0.1 },
  ];

  const [tickers, reports] = await Promise.all([tickerRoutes(), reportRoutes()]);
  return [...staticRoutes, ...tickers, ...reports];
}
