import Link from "next/link";
import type { Metadata } from "next";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { TabBar } from "@/components/feed/tab-bar";
import { ReportCard } from "@/components/report-card";
import { AnalystCard } from "@/components/analyst-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonClass } from "@/components/ui/button";
import { listFeed, listFeedFromAnalysts } from "@/lib/db/reports";
import { listTopAnalysts } from "@/lib/db/profiles";
import { getSessionProfile } from "@/lib/db/auth";
import { followedAnalystIds, subscribedAnalystIds } from "@/lib/db/social";
import { resolvedCountByAuthor } from "@/lib/db/predictions";
import { sampleAnalysts } from "@/lib/sample";
import { QuickPost } from "@/components/feed/quick-post";

export const metadata: Metadata = { title: "Discover" };

const TABS = [
  { key: "trending", label: "Trending" },
  { key: "recent", label: "Recent" },
  { key: "researchers", label: "Researchers" },
  { key: "following", label: "Following" },
  { key: "subscriptions", label: "Subscriptions" },
];

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "trending" } = await searchParams;
  const profile = await getSessionProfile();
  const userId = profile?.id ?? null;

  let reports;
  let researchers: Awaited<ReturnType<typeof listTopAnalysts>> = [];
  let researcherCounts: Record<string, number> = {};
  let needsAuth = false;

  if (tab === "researchers") {
    researchers = await listTopAnalysts(24);
    researcherCounts = Object.fromEntries(
      await Promise.all(
        researchers.map(async (a) => [a.id, await resolvedCountByAuthor(a.id)] as const),
      ),
    );
  } else if (tab === "following") {
    if (!userId) needsAuth = true;
    else reports = await listFeedFromAnalysts(await followedAnalystIds(userId));
  } else if (tab === "subscriptions") {
    if (!userId) needsAuth = true;
    else reports = await listFeedFromAnalysts(await subscribedAnalystIds(userId));
  } else {
    reports = await listFeed({ sort: tab === "recent" ? "recent" : "trending" });
  }

  const topRaw = await listTopAnalysts(5);
  const top =
    topRaw.length > 0
      ? await Promise.all(
          topRaw.map(async (a) => ({ analyst: a, resolved: await resolvedCountByAuthor(a.id) })),
        )
      : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-5">
        <div>
          <h1 className="t-h1">Discover</h1>
          <p className="t-body mt-1">Research and calls from independent analysts.</p>
        </div>
        {profile && <QuickPost profile={profile} />}

        <TabBar tabs={TABS} active={tab} />

        {needsAuth ? (
          <EmptyState
            icon={<Compass size={32} />}
            title="Sign in to see your feed"
            body="Follow analysts and subscribe to build a personalized feed of research and calls."
            action={
              <Link href="/sign-in" className={buttonClass("primary", "md")}>
                Sign in
              </Link>
            }
          />
        ) : tab === "researchers" ? (
          researchers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {researchers.map((a) => (
                <AnalystCard
                  key={a.id}
                  analyst={a}
                  resolvedCalls={researcherCounts[a.id] ?? 0}
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
          <div className="flex flex-col gap-5">
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Compass size={32} />}
            title="Nothing here yet"
            body={
              tab === "following" || tab === "subscriptions"
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

      <aside className="hidden flex-col gap-4 lg:flex">
        <h2 className="t-eyebrow">Top analysts</h2>
        <div className="flex flex-col gap-4">
          {(top
            ? top.map(({ analyst, resolved }) => (
                <AnalystCard key={analyst.id} analyst={analyst} resolvedCalls={resolved} />
              ))
            : sampleAnalysts.slice(0, 3).map((a) => (
                <AnalystCard key={a.id} analyst={a} spark={a.spark} resolvedCalls={a.resolved} />
              )))}
        </div>
      </aside>
    </div>
  );
}
