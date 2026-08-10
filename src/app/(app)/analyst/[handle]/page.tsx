import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format, formatDistanceToNowStrict } from "date-fns";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { listByAuthor } from "@/lib/db/reports";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, isSubscribed } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listActivePlans } from "@/lib/db/plans";
import { analystStats } from "@/lib/engine/track";
import { pct, compact, usd } from "@/lib/format";
import type { Direction, Prediction, Report } from "@/lib/types";
import {
  AnalystProfileView,
  type ProfileVerdict,
  type ProfileReportRow,
  type ProfileVideo,
  type ProfilePinned,
} from "@/components/profile/analyst-profile-view";

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
    profile.headline || profile.bio?.slice(0, 160) || `Independent analyst on Stoa · @${profile.handle}`;
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

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Placeholder content badge until video/cards presence is stored per publication. */
function badgeFor(type: Report["type"]): string {
  if (type === "research") return "VIDEO · THESIS";
  if (type === "short_post") return "VIDEO · NOTE";
  return "VIDEO · CALL";
}

function typeLabel(type: Report["type"]): string {
  if (type === "research") return "RESEARCH";
  if (type === "short_post") return "NOTE";
  return "CALL";
}

export default async function AnalystProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const profile = await getProfileByHandle(handle);
  if (!profile) notFound();

  const [predictions, reports, userId, plans] = await Promise.all([
    listPredictionsByAuthor(profile.id),
    listByAuthor(profile.id, { status: "published" }),
    getSessionUserId(),
    listActivePlans(profile.id),
  ]);

  const stats = analystStats(predictions);
  const isSelf = userId === profile.id;
  const [following, subscribed, wallet] = await Promise.all([
    userId ? isFollowing(userId, profile.id) : Promise.resolve(false),
    userId ? isSubscribed(userId, profile.id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
  ]);

  const reportById = new Map<string, Report>(reports.map((r) => [r.id, r]));
  const predByReport = new Map<string, Prediction>();
  for (const p of predictions) if (!predByReport.has(p.report_id)) predByReport.set(p.report_id, p);

  const score = profile.score || stats.score || null;
  const provisional = stats.total < 5;
  const name = profile.display_name;
  const firstName = name.split(/\s+/)[0] || name;
  const joinedYear = new Date(profile.created_at).getFullYear();

  const recordLine =
    stats.total === 0
      ? "Not yet scored"
      : provisional
        ? "Provisional · small sample"
        : `${Math.round((stats.winRate ?? 0) * 100)}% hit rate over ${stats.total} resolved calls`;

  const confidenceLine =
    stats.total === 0
      ? "NO RESOLVED CALLS YET"
      : provisional
        ? `PARTIAL SAMPLE · ${stats.total} RESOLVED CALL${stats.total === 1 ? "" : "S"}`
        : `FULL SAMPLE · ${stats.total} RESOLVED CALLS`;

  // Stat tiles (win rate + alpha read "—" for provisional / insufficient data).
  const tiles: { label: string; value: string; tone: "ink" | "up" }[] = [
    {
      label: "WIN RATE",
      value: provisional || stats.winRate == null ? "—" : pct(stats.winRate * 100, false),
      tone: "ink",
    },
    {
      label: "AVG RETURN",
      value: stats.avgReturn == null ? "—" : pct(stats.avgReturn),
      tone: stats.avgReturn != null && stats.avgReturn > 0 ? "up" : "ink",
    },
    {
      label: "ALPHA VS S&P",
      value: stats.avgAlpha == null ? "—" : pct(stats.avgAlpha),
      tone: stats.avgAlpha != null && stats.avgAlpha > 0 ? "up" : "ink",
    },
    { label: "RESOLVED", value: String(stats.total), tone: "ink" },
  ];

  // Verdicts = resolved calls, newest first.
  const resolved = predictions
    .filter((p) => ["hit", "near", "miss", "partial"].includes(p.outcome) && p.lock_price && p.resolved_price != null)
    .sort((a, b) => +new Date(b.resolution_trading_date ?? b.resolves_at) - +new Date(a.resolution_trading_date ?? a.resolves_at));

  const verdicts: ProfileVerdict[] = resolved.map((p) => {
    const dateISO = p.resolution_trading_date ?? p.resolves_at;
    return {
      id: p.id,
      href: `/report/${p.report_id}`,
      ticker: p.ticker,
      direction: p.direction as Direction,
      title: reportById.get(p.report_id)?.title ?? `${p.ticker} call`,
      entryExit: `${p.lock_price?.toFixed(2)} → ${p.resolved_price?.toFixed(2)}`,
      retLabel: p.return_pct == null ? "—" : pct(p.return_pct),
      retTone: p.return_pct == null ? "neutral" : p.return_pct > 0 ? "up" : p.return_pct < 0 ? "down" : "neutral",
      dateISO,
      dateLabel: format(new Date(dateISO), "MMM d, yyyy").toUpperCase(),
      sealStatus: p.outcome === "hit" ? "hit" : p.outcome === "near" ? "near" : "miss",
    };
  });

  // Reports tab = publications with a thesis (call + research); notes live under Videos.
  const thesisReports = reports.filter((r) => r.type === "research" || r.type === "call");
  const reportRows: ProfileReportRow[] = thesisReports.map((r) => {
    const gated = String(r.access).startsWith("sub") ? "subscribers" : r.price && r.price > 0 ? "paid" : "free";
    const access = gated === "subscribers" ? "SUBSCRIBERS" : gated === "paid" ? `$${r.price}` : "FREE";
    const locked = gated !== "free" && !subscribed && !isSelf;
    const when = r.published_at ?? r.created_at;
    return {
      id: r.id,
      href: `/report/${r.id}`,
      typeLabel: typeLabel(r.type),
      ticker: r.ticker,
      badge: badgeFor(r.type),
      dateLabel: format(new Date(when), "MMM d").toUpperCase(),
      title: r.title ?? "Untitled",
      deck: r.summary,
      access,
      accessTone: gated === "subscribers" ? "mute" : "ink",
      locked,
    };
  });

  // Videos = every publication (placeholder: no real video model/thumbnails/durations yet).
  const videos: ProfileVideo[] = reports.map((r) => {
    const when = r.published_at ?? r.created_at;
    return {
      id: r.id,
      href: `/report/${r.id}`,
      title: r.title ?? "Untitled",
      meta: `${r.ticker ? `${r.ticker} · ` : ""}${formatDistanceToNowStrict(new Date(when)).toUpperCase()} AGO · ${compact(r.views)} VIEWS`,
      duration: "0:00", // placeholder
    };
  });

  // Pinned = most recent publication (placeholder: no real "pinned" flag or video yet).
  const pinnedReport = reports[0];
  const pinned: ProfilePinned | null = pinnedReport
    ? {
        href: `/report/${pinnedReport.id}`,
        ticker: pinnedReport.ticker,
        direction: (predByReport.get(pinnedReport.id)?.direction as Direction) ?? null,
        badge: badgeFor(pinnedReport.type),
        title: pinnedReport.title ?? "Untitled",
        meta: `${pinnedReport.ticker ? `${pinnedReport.ticker} · ` : ""}${formatDistanceToNowStrict(new Date(pinnedReport.published_at ?? pinnedReport.created_at)).toUpperCase()} AGO · ${compact(pinnedReport.views)} VIEWS`,
        duration: "0:00", // placeholder
      }
    : null;

  // Subscribe button label: "from $X/mo" using the cheapest paid plan (or legacy price).
  const paidPrices = plans.filter((p) => p.price_cents > 0).map((p) => p.price_cents / 100);
  const fromPrice = paidPrices.length ? Math.min(...paidPrices) : profile.sub_price ?? null;
  const subscribeLabel = fromPrice ? `Subscribe · from ${usd(fromPrice)}/mo` : "Subscribe";

  return (
    <AnalystProfileView
      handle={profile.handle}
      name={name}
      firstName={firstName}
      initials={initialsOf(name)}
      avatarUrl={profile.avatar_url}
      verified={profile.verified}
      specialty={profile.headline?.trim() || "Independent analyst on Stoa"}
      bio={profile.bio}
      handleLine={`@${profile.handle.toUpperCase()} · ${compact(profile.followers_count)} FOLLOWERS · JOINED ${joinedYear}`}
      isSelf={isSelf}
      score={score}
      provisional={provisional}
      scoreLabel="TRACK SCORE"
      recordLine={recordLine}
      confidenceLine={confidenceLine}
      tiles={tiles}
      counts={{ videos: videos.length, verdicts: verdicts.length, reports: reportRows.length }}
      videos={videos}
      pinned={pinned}
      verdicts={verdicts}
      reports={reportRows}
      predictions={predictions}
      series={stats.series}
      breakdown={stats.breakdown}
      hits={stats.hits}
      nearHits={stats.nearHits}
      misses={stats.misses}
      total={stats.total}
      analystId={profile.id}
      initialFollowing={following}
      isAuthed={Boolean(userId)}
      subscribeLabel={subscribeLabel}
      plans={plans}
      balance={wallet?.balance ?? 0}
    />
  );
}
