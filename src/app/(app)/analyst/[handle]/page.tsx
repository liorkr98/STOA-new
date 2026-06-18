import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SealCheck, Users } from "@phosphor-icons/react/dist/ssr";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { listByAuthor } from "@/lib/db/reports";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, isSubscribed } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { analystStats } from "@/lib/engine/track";
import { compact, pct, analystRating } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { Stat } from "@/components/ui/stat";
import { ScoreRing } from "@/components/score-ring";
import { TrackChart } from "@/components/charts/track-chart";
import { TabBar } from "@/components/feed/tab-bar";
import { ReportCard } from "@/components/report-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FollowButton } from "@/components/follow-button";
import { SubscribeButton } from "@/components/wallet/subscribe-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  return { title: profile ? `${profile.display_name} (@${profile.handle})` : "Analyst" };
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

  const [predictions, reports, userId] = await Promise.all([
    listPredictionsByAuthor(profile.id),
    listByAuthor(profile.id, { status: "published" }),
    getSessionUserId(),
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

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
        <div className="h-28 w-full bg-gradient-to-r from-accent/25 via-accent/10 to-transparent" />
        <div className="grid gap-6 px-6 pb-6 lg:grid-cols-[1fr_280px]">
          <div className="-mt-10 flex flex-col gap-4">
            <Avatar
              src={profile.avatar_url}
              name={profile.display_name}
              size="xl"
              className="ring-4 ring-[var(--surface)]"
            />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="t-h2">{profile.display_name}</h1>
                {profile.verified && <SealCheck size={20} weight="fill" className="text-accent" />}
                <TierBadge tier={stats.tier.key} label={stats.tier.label} />
              </div>
              <p className="t-meta mt-1">
                @{profile.handle} · <Users size={13} className="inline" />{" "}
                <span className="num">{compact(profile.followers_count)}</span> followers
              </p>
              {profile.headline && <p className="t-body mt-3">{profile.headline}</p>}
            </div>
            {!isSelf && (
              <div className="flex flex-wrap items-center gap-3">
                <FollowButton
                  analystId={profile.id}
                  initialFollowing={following}
                  isAuthed={Boolean(userId)}
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-5 rounded-[var(--radius-card)] border border-border bg-bg p-5">
            <ScoreRing rating={analystRating(profile)} mode="rating" />
            <p className="t-meta text-center">
              Score <span className="num">{profile.score || stats.score}</span> / 100
            </p>
            <p className="t-meta text-center">
              {stats.resolved > 0
                ? `${stats.resolved} resolved calls`
                : "Building a track record"}
            </p>
            {!isSelf && (
              <SubscribeButton
                analystId={profile.id}
                handle={profile.handle}
                price={profile.sub_price}
                balance={wallet?.balance ?? 0}
                isAuthed={Boolean(userId)}
                subscribed={subscribed}
              />
            )}
          </div>
        </div>
      </div>

      {/* Track record */}
      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <div className="flex items-center justify-between">
          <h2 className="t-h3">Track record</h2>
          <span className="num text-sm text-text-mute">Rating {analystRating(profile)}</span>
        </div>
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

      {/* Publications */}
      <section className="flex flex-col gap-5">
        <TabBar tabs={VIEWS} active={view} param="view" />
        {filtered.length > 0 ? (
          <div className="grid gap-5">
            {filtered.map((r) => (
              <ReportCard key={r.id} report={{ ...r, author: profile }} />
            ))}
          </div>
        ) : (
          <EmptyState title="Nothing published here yet" />
        )}
      </section>
    </div>
  );
}
