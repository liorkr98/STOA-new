import type { CSSProperties } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { listByAuthor } from "@/lib/db/reports";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, isSubscribed } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listPollsByCreator } from "@/lib/db/polls";
import { listActivePlans } from "@/lib/db/plans";
import { PollCard } from "@/components/polls/poll-card";
import { PlanPicker } from "@/components/wallet/plan-picker";
import { StorefrontSections } from "@/components/profile/storefront-sections";
import { analystStats } from "@/lib/engine/track";
import { pct } from "@/lib/format";
import { accentVars, checkAccent } from "@/lib/profile/accent";
import { fontPairingVars } from "@/lib/profile/fonts";
import { ProfileHeader } from "@/components/profile/profile-header";
import { Stat } from "@/components/ui/stat";
import { MoatBadge } from "@/components/ui/moat-badge";
import { TrackChart } from "@/components/charts/track-chart";
import { TabBar } from "@/components/feed/tab-bar";
import { ReportCard } from "@/components/report-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/follow-button";
import { SubscribeButton } from "@/components/wallet/subscribe-button";
import { TrackBreakdown } from "@/components/track/track-breakdown";
import { CallHistory } from "@/components/track/call-history";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) return { title: "Analyst" };

  const title = `${profile.display_name} (@${profile.handle})`;
  const description =
    profile.headline || profile.bio?.slice(0, 160) || `Independent analyst on Stoa — @${profile.handle}`;
  const image = profile.cover_url || profile.avatar_url;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      ...(image ? { images: [{ url: image, alt: profile.display_name }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

const VIEWS = [
  { key: "all", label: "All" },
  { key: "research", label: "Research" },
  { key: "calls", label: "Calls" },
  { key: "posts", label: "Posts" },
];

export default async function AnalystProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { handle } = await params;
  const { view = "all" } = await searchParams;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [predictions, reports, userId, polls, plans] = await Promise.all([
    listPredictionsByAuthor(profile.id),
    listByAuthor(profile.id, { status: "published" }),
    getSessionUserId(),
    listPollsByCreator(profile.id, 3),
    listActivePlans(profile.id),
  ]);

  const stats = analystStats(predictions);
  const isSelf = userId === profile.id;
  const [following, subscribed, wallet] = await Promise.all([
    userId ? isFollowing(userId, profile.id) : Promise.resolve(false),
    userId ? isSubscribed(userId, profile.id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
  ]);

  const filtered = reports.filter((r) =>
    view === "all"
      ? true
      : view === "research"
        ? r.type === "research"
        : view === "calls"
          ? r.type === "call"
          : r.type === "short_post",
  );

  const config = profile.profile_config ?? {};
  // Scoped custom accent (B1): overrides --accent for this storefront subtree
  // only. Re-validated at render so a bad stored value never ships.
  const accentCheck = config.accent ? checkAccent(config.accent) : null;
  const storefrontStyle = {
    ...(accentCheck?.valid && accentCheck.hex ? accentVars(accentCheck.hex) : {}),
    ...fontPairingVars(config.font_pairing),
  } as CSSProperties;

  const layout = config.layout ?? "list";

  return (
    <div
      className={`flex flex-col gap-8 ${config.texture ? "paper-texture" : ""}`}
      style={storefrontStyle}
    >
      <ProfileHeader
        profile={profile}
        config={config}
        showEditLink={isSelf}
        aside={
          <>
            <MoatBadge
              handle={profile.handle}
              score={profile.score || stats.score || null}
              hitRate={stats.winRate}
              sampleSize={stats.resolved}
              size="lg"
            />
            {!isSelf &&
              (plans.length > 0 ? (
                <PlanPicker
                  plans={plans}
                  handle={profile.handle}
                  balance={wallet?.balance ?? 0}
                  isAuthed={Boolean(userId)}
                  subscribed={subscribed}
                />
              ) : (
                <SubscribeButton
                  analystId={profile.id}
                  handle={profile.handle}
                  price={profile.sub_price}
                  balance={wallet?.balance ?? 0}
                  isAuthed={Boolean(userId)}
                  subscribed={subscribed}
                />
              ))}
          </>
        }
      />
      {!isSelf && (
        <FollowButton
          analystId={profile.id}
          initialFollowing={following}
          isAuthed={Boolean(userId)}
        />
      )}

      {polls.length > 0 && (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {polls.map((poll) => (
            <PollCard key={poll.id} poll={poll} isAuthed={Boolean(userId)} />
          ))}
        </section>
      )}

      <StorefrontSections sections={config.storefront_sections ?? []} reports={reports} />

      {/* Track record */}
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h3">Track record</h2>
        <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {stats.series.length > 1 ? (
            <TrackChart data={stats.series} />
          ) : (
            <div className="flex h-56 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border">
              <p className="t-meta">Track chart appears after resolved calls.</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-5 self-center">
            <Stat
              label="Win rate"
              value={stats.winRate != null ? pct(stats.winRate * 100, false) : "-"}
            />
            <Stat
              label="Profit factor"
              value={stats.profitFactor != null ? stats.profitFactor.toFixed(2) : "-"}
            />
            <Stat
              label="Avg return"
              value={pct(stats.avgReturn)}
              tone={stats.avgReturn == null ? "neutral" : stats.avgReturn >= 0 ? "up" : "down"}
            />
            <Stat
              label="Alpha vs S&P"
              value={pct(stats.avgAlpha)}
              tone={stats.avgAlpha == null ? "neutral" : stats.avgAlpha >= 0 ? "up" : "down"}
            />
          </div>
        </div>
      </section>

      {/* Score breakdown + tier progress */}
      {stats.total > 0 && (
        <TrackBreakdown
          score={stats.score}
          breakdown={stats.breakdown}
          hits={stats.hits}
          nearHits={stats.nearHits}
          misses={stats.misses}
          total={stats.total}
        />
      )}

      {/* Full call ledger */}
      <p className="t-meta">All calls, including missed targets, stay visible permanently.</p>
      <CallHistory predictions={predictions} />

      {/* Publications */}
      <section className="flex flex-col gap-5">
        <TabBar tabs={VIEWS} active={view} param="view" />
        {filtered.length > 0 ? (
          layout === "magazine" && filtered.length > 1 ? (
            <div className="flex flex-col gap-5">
              <ReportCard report={{ ...filtered[0], author: profile }} />
              <div className="grid gap-5 sm:grid-cols-2">
                {filtered.slice(1).map((r) => (
                  <ReportCard key={r.id} report={{ ...r, author: profile }} />
                ))}
              </div>
            </div>
          ) : (
            <div className={layout === "grid" ? "grid gap-5 sm:grid-cols-2" : "grid gap-5"}>
              {filtered.map((r) => (
                <ReportCard key={r.id} report={{ ...r, author: profile }} />
              ))}
            </div>
          )
        ) : (
          <EmptyState title="Nothing published here yet" />
        )}
      </section>
    </div>
  );
}
