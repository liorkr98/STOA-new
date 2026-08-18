import Link from "next/link";
import type { Metadata } from "next";
import { Compass } from "lucide-react";
import { TabBar } from "@/components/feed/tab-bar";
import { AnalystCard } from "@/components/analyst-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { FilterBar } from "@/components/discover/filter-bar";
import { ReportBlock } from "@/components/discover/report-block";
import { FeedPage } from "@/components/feed/feed-page";
import { clipsToPublications } from "@/lib/feed/build-publications";
import { listCommentsForReports } from "@/lib/db/comments";
import { postFeedComment } from "@/app/actions/feed";
import type { FeedComment } from "@/lib/feed/types";
import { DiscoverLayoutToggle } from "@/components/discover/layout-toggle";
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
import { resolvedCountByAuthor } from "@/lib/db/predictions";
import { listVideoClipCards, type VideoClipCard } from "@/lib/db/video-clips";
import { isVideoFirstDiscover } from "@/lib/db/feature-flags";
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
  ticker?: string;
  status?: string;
  mcap?: string;
  /** "video" | "text" -- force a layout regardless of the flag. */
  layout?: string;
}

function parseFeedFilters(params: DiscoverParams): FeedFilters {
  const filters: FeedFilters = {};
  if (params.type && CONTENT_TYPES.includes(params.type as ContentType)) {
    filters.type = params.type as ContentType;
  }
  if (params.access && ACCESS_TYPES.includes(params.access as AccessType)) {
    filters.access = params.access as AccessType;
  }
  if (params.ticker?.trim()) filters.ticker = params.ticker.trim().toUpperCase();
  if (params.status === "open" || params.status === "resolved") {
    filters.status = params.status;
  }
  if (params.mcap && CAP_BANDS.includes(params.mcap as CapBand)) {
    filters.mcap = params.mcap as CapBand;
  }
  return filters;
}

/** In-memory filter for the video grid: the same trust-surface filters, applied
 * to the joined report (market-cap filtering stays text-only). */
function videoCardMatches(card: VideoClipCard, filters: FeedFilters): boolean {
  const report = card.report;
  if (!report) return false;
  if (filters.type && report.type !== filters.type) return false;
  if (filters.access && report.access !== filters.access) return false;
  if (filters.ticker) {
    const t = (report.ticker ?? report.prediction?.ticker ?? "").toUpperCase();
    if (t !== filters.ticker) return false;
  }
  if (filters.status) {
    const outcome = report.prediction?.outcome;
    if (filters.status === "open" && outcome !== "open") return false;
    if (filters.status === "resolved" && (!outcome || outcome === "open")) return false;
  }
  return true;
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

  // Part 1: video-first layout is flag-gated and reversible. `?layout=video|text`
  // forces either layout so the legacy feed stays reachable at all times.
  const flagOn = await isVideoFirstDiscover();
  const videoFirst =
    tab !== "researchers" &&
    (params.layout === "video" || (flagOn && params.layout !== "text"));

  let reports: Report[] | undefined;
  let videos: VideoClipCard[] | undefined;
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
    researcherCounts = Object.fromEntries(
      await Promise.all(
        researchers.map(async (a) => [a.id, await resolvedCountByAuthor(a.id)] as const),
      ),
    );
  } else if (videoFirst) {
    // Video-led grid. The clip is the anchor; the linked report is the depth.
    const allCards = await listVideoClipCards(72);
    let scoped = allCards;
    if (tab === "following") {
      if (!userId) needsAuth = true;
      else {
        const ids = new Set(await followedAnalystIds(userId));
        scoped = allCards.filter((c) => c.report && ids.has(c.report.author_id));
      }
    } else if (tab === "subscriptions") {
      if (!userId) needsAuth = true;
      else {
        const ids = new Set(await subscribedAnalystIds(userId));
        scoped = allCards.filter((c) => c.report && ids.has(c.report.author_id));
      }
    }
    videos = needsAuth ? [] : scoped.filter((c) => videoCardMatches(c, filters));
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

  // The Feed player: publications built from clips, with their discussions.
  const publications = videos && videos.length > 0 ? await clipsToPublications(videos) : [];
  if (publications.length > 0) {
    const commentsByReport = await listCommentsForReports(publications.map((p) => p.id));
    for (const pub of publications) {
      const authorHandle = pub.analyst.handle;
      pub.comments = (commentsByReport.get(pub.id) ?? []).map(
        (c): FeedComment => ({
          id: c.id,
          parentId: null,
          author: {
            handle: c.author?.handle ?? "",
            displayName: c.author?.display_name ?? "Reader",
            avatarUrl: c.author?.avatar_url ?? null,
            isAuthor: c.author?.handle === authorHandle,
          },
          createdAt: c.created_at,
          text: c.body,
          likes: c.likes ?? 0,
        }),
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="t-h1">Discover</h1>
          <p className="t-body mt-1">
            Browse every published call and report. Your ranked briefing lives on{" "}
            <Link href="/home" className="text-accent hover:underline">
              Today
            </Link>
            . Guests can read the public{" "}
            <Link href="/dispatch" className="text-accent hover:underline">
              dispatch
            </Link>
            .
          </p>
        </div>
        {tab !== "researchers" && (
          <DiscoverLayoutToggle current={videoFirst ? "video" : "text"} />
        )}
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
      ) : videoFirst ? (
        publications.length > 0 ? (
          <FeedPage publications={publications} canPost={Boolean(userId)} onPost={userId ? postFeedComment : undefined} />
        ) : (
          <EmptyState
            icon={<Compass size={32} />}
            title={filtersActive ? "No videos match these filters" : "No videos yet"}
            body={
              filtersActive
                ? "Loosen a filter, or switch to the text layout to see every report."
                : "Analysts are still recording. Switch to the text layout to browse every report."
            }
            action={
              <Link
                href={`/discover?tab=${tab}&layout=text`}
                className={buttonClass("secondary", "md")}
              >
                Switch to text layout
              </Link>
            }
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
