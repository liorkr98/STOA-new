import Link from "next/link";
import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { TabBar } from "@/components/feed/tab-bar";
import { AnalystCard } from "@/components/analyst-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { FilterBar } from "@/components/discover/filter-bar";
import { ReportBlock } from "@/components/discover/report-block";
import {
  listFeed,
  listFeedFromAnalysts,
  getReportsByIds,
  type FeedFilters,
} from "@/lib/db/reports";
import { listTopAnalysts, getProfilesByIds } from "@/lib/db/profiles";
import { listBoostedProfileIds, listBoostedReportIds } from "@/lib/db/boosts";
import { getSessionProfile } from "@/lib/db/auth";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { resolvedCountsByAuthors } from "@/lib/db/predictions";
import { QuickPost } from "@/components/feed/quick-post";
import type { CapBand } from "@/lib/market/cap-bands";
import type { AccessType, ContentType, Report } from "@/lib/types";

export const metadata: Metadata = { title: "Discover" };

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "recent", label: "Recent" },
  { key: "researchers", label: "Researchers" },
  { key: "following", label: "Following" },
  { key: "subscriptions", label: "Subscriptions" },
];

const CONTENT_TYPES: ContentType[] = ["research", "call", "short_post"];
const CAP_BANDS: CapBand[] = ["mega", "large", "mid", "small"];
const ACCESS_TYPES: AccessType[] = ["free", "paid", "subscribers"];

interface DiscoverParams {
  tab?: string;
  type?: string;
  access?: string;
  score?: string;
  /** @deprecated Use `score` */
  moat?: string;
  ticker?: string;
  status?: string;
  mcap?: string;
}

function parseFeedFilters(params: DiscoverParams): FeedFilters {
  const filters: FeedFilters = {};
  if (params.type && CONTENT_TYPES.includes(params.type as ContentType)) {
    filters.type = params.type as ContentType;
  }
  if (params.access && ACCESS_TYPES.includes(params.access as AccessType)) {
    filters.access = params.access as AccessType;
  }
  const minScore = Number(params.score ?? params.moat);
  if (minScore > 0) filters.minScore = minScore;
  if (params.ticker?.trim()) filters.ticker = params.ticker.trim().toUpperCase();
  if (params.status === "open" || params.status === "resolved") {
    filters.status = params.status;
  }
  if (params.mcap && CAP_BANDS.includes(params.mcap as CapBand)) {
    filters.mcap = params.mcap as CapBand;
  }
  return filters;
}

/** Mosaic span classes: first block leads wide, second stacks beside it, rest tile 3-up. */
function blockSpan(index: number): string {
  if (index === 0) return "lg:col-span-4";
  if (index === 1) return "lg:col-span-2";
  return "lg:col-span-2";
}

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<DiscoverParams>;
}) {
  const params = await searchParams;
  const tab = params.tab ?? "trending";
  const profile = await getSessionProfile();
  const userId = profile?.id ?? null;
  const filters = parseFeedFilters(params);
  const filtersActive = Object.keys(filters).length > 0;

  let reports: Report[] | undefined;
  let researchers: Awaited<ReturnType<typeof listTopAnalysts>> = [];
  let researcherCounts: Record<string, number> = {};
  let needsAuth = false;

  let promotedAnalystIds = new Set<string>();
  let promotedReportIds = new Set<string>();

  if (tab === "researchers") {
    try {
      const boostedIds = await listBoostedProfileIds("discover_researchers", 4);
      promotedAnalystIds = new Set(boostedIds);
      const boosted = await getProfilesByIds(boostedIds);
      const organic = await listTopAnalysts(24);
      const seen = new Set(boostedIds);
      researchers = [...boosted, ...organic.filter((a) => !seen.has(a.id))].slice(0, 24);
    } catch {
      researchers = await listTopAnalysts(24);
    }
    researcherCounts = await resolvedCountsByAuthors(researchers.map((a) => a.id));
  } else if (tab === "following") {
    if (!userId) needsAuth = true;
    else reports = await listFeedFromAnalysts(await followedAnalystIds(userId), 36, filters);
  } else if (tab === "subscriptions") {
    if (!userId) needsAuth = true;
    else reports = await listFeedFromAnalysts(await subscribedAnalystIds(userId), 36, filters);
  } else {
    const sort = tab === "recent" ? "recent" : "trending";
    reports = await listFeed({ sort, limit: 36, filters });
    if (sort === "trending" && !filtersActive) {
      try {
        const boostedIds = await listBoostedReportIds("feed_trending", 2);
        promotedReportIds = new Set(boostedIds);
        const boosted = await getReportsByIds(boostedIds);
        const seen = new Set(boostedIds);
        reports = [...boosted, ...(reports ?? []).filter((r) => !seen.has(r.id))];
      } catch {
        // boosts table may not exist until migration 0021 is applied
      }
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="t-h1">Discover</h1>
        <p className="t-body mt-1">
          Browse every published call and report. Today&apos;s ranked issue lives on{" "}
          <Link href="/" className="text-accent hover:underline">
            the dispatch
          </Link>
          .
        </p>
      </div>

      {profile && (profile.role === "analyst" || profile.role === "admin") && (
        <QuickPost profile={profile} />
      )}

      <TabBar
        tabs={TABS}
        active={tab}
        query={new URLSearchParams(
          Object.entries(params)
            .filter(([, v]) => v != null && v !== "")
            .map(([k, v]) => [k, String(v)]),
        ).toString()}
      />

      {tab !== "researchers" && <FilterBar />}

      {needsAuth ? (
        <EmptyState
          icon={<Compass size={32} />}
          title="Sign in to see your feed"
          body="Follow analysts and subscribe to build a personalized view of research and calls."
          action={
            <Link href="/sign-in" className={buttonClass("primary", "md")}>
              Sign in
            </Link>
          }
        />
      ) : tab === "researchers" ? (
        researchers.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {researchers.map((a) => (
              <AnalystCard
                key={a.id}
                analyst={a}
                resolvedCalls={researcherCounts[a.id] ?? 0}
                promoted={promotedAnalystIds.has(a.id)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No analysts yet"
            body="Once analysts publish and build track records, they will appear here."
          />
        )
      ) : reports && reports.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {reports.map((r, i) => (
            <div key={r.id} className={`${blockSpan(i)} h-full`}>
              <ReportBlock
                report={r}
                size={i === 0 ? "lead" : "std"}
                promoted={promotedReportIds.has(r.id)}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Compass size={32} />}
          title={filtersActive ? "Nothing matches these filters" : "Nothing here yet"}
          body={
            filtersActive
              ? "Filters search published research across the catalog. Loosen a filter or clear them to see more."
              : tab === "following" || tab === "subscriptions"
                ? "Follow or subscribe to analysts and their work will show up here."
                : "Once analysts publish, their research will appear here."
          }
          action={
            <Link href="/discover?tab=trending" className={buttonClass("secondary", "md")}>
              Browse trending
            </Link>
          }
        />
      )}
    </div>
  );
}
