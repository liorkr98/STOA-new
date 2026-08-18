import type { CSSProperties } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { listByAuthor } from "@/lib/db/reports";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, isSubscribed, subscriberCount } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listActivePlans } from "@/lib/db/plans";
import { pct, compact, usd } from "@/lib/format";
import { accentVars, checkAccent } from "@/lib/profile/accent";
import { fontPairingVars } from "@/lib/profile/fonts";
import type { Direction, Prediction, Report } from "@/lib/types";
import type {
  AnalystProfileViewProps,
  ProfileVerdict,
  ProfileReportRow,
  ProfileVideo,
  ProfilePinned,
} from "@/components/profile/analyst-profile-view";

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

/**
 * Builds the storefront view-model for a handle. Shared by the public page
 * (/analyst/[handle], no sidebar) and the owner's own profile area
 * (/profile, rendered inside the private shell's sidebar), so both surfaces
 * render exactly the same storefront from one source.
 */
export async function buildProfileView(
  handle: string,
): Promise<AnalystProfileViewProps | null> {
  const profile = await getProfileByHandle(handle);
  if (!profile) return null;

  const [predictions, reports, userId, plans] = await Promise.all([
    listPredictionsByAuthor(profile.id),
    listByAuthor(profile.id, { status: "published" }),
    getSessionUserId(),
    listActivePlans(profile.id),
  ]);

  const isSelf = userId === profile.id;
  const config = profile.profile_config ?? {};
  const showMembers = config.show_member_count === true;
  const [following, subscribed, wallet, members] = await Promise.all([
    userId ? isFollowing(userId, profile.id) : Promise.resolve(false),
    userId ? isSubscribed(userId, profile.id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
    showMembers ? subscriberCount(profile.id) : Promise.resolve(0),
  ]);

  const reportById = new Map<string, Report>(reports.map((r) => [r.id, r]));
  const predByReport = new Map<string, Prediction>();
  for (const p of predictions) if (!predByReport.has(p.report_id)) predByReport.set(p.report_id, p);

  // Per-analyst storefront theming (branding studio Style tab): scoped custom
  // accent (re-validated so a bad stored value never ships), font pairing, and
  // the optional paper texture. Applied to the profile subtree only.
  const accentCheck = config.accent ? checkAccent(config.accent) : null;
  const storefrontStyle = {
    ...(accentCheck?.valid && accentCheck.hex ? accentVars(accentCheck.hex) : {}),
    ...fontPairingVars(config.font_pairing),
  } as CSSProperties;
  const name = profile.display_name;
  const firstName = name.split(/\s+/)[0] || name;
  const joinedYear = new Date(profile.created_at).getFullYear();

  // The only two audience numbers shown anywhere on the platform. Followers is
  // always present; members (paying subscribers) only when the analyst opted in
  // from the Storefront.
  const audienceLine = [
    `${compact(profile.followers_count)} FOLLOWERS`,
    ...(showMembers ? [`${compact(members)} MEMBER${members === 1 ? "" : "S"}`] : []),
  ].join(" · ");

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

  // Pinned = the report the analyst pinned from Studio (config.pinned_report_id),
  // falling back to the most recent publication.
  const pinnedReport =
    (config.pinned_report_id && reports.find((r) => r.id === config.pinned_report_id)) || reports[0];
  const pinned: ProfilePinned | null = pinnedReport
    ? {
        href: `/report/${pinnedReport.id}`,
        ticker: pinnedReport.ticker,
        direction: (predByReport.get(pinnedReport.id)?.direction as Direction) ?? null,
        badge: badgeFor(pinnedReport.type),
        title: pinnedReport.title ?? "Untitled",
        deck: pinnedReport.summary,
        footer: `${format(new Date(pinnedReport.published_at ?? pinnedReport.created_at), "MMM d, yyyy").toUpperCase()} · ${compact(pinnedReport.views)} VIEWS`,
        duration: "0:00", // placeholder
      }
    : null;

  // Subscribe button label: "from $X/mo" using the cheapest paid plan (or legacy price).
  const paidPrices = plans.filter((p) => p.price_cents > 0).map((p) => p.price_cents / 100);
  const fromPrice = paidPrices.length ? Math.min(...paidPrices) : profile.sub_price ?? null;
  const subscribeLabel = fromPrice ? `Subscribe · from ${usd(fromPrice)}/mo` : "Subscribe";

  return {
    handle: profile.handle,
    name,
    firstName,
    initials: initialsOf(name),
    avatarUrl: profile.avatar_url,
    verified: profile.verified,
    specialty: profile.headline?.trim() || "Independent analyst on Stoa",
    bio: profile.bio,
    handleLine: `@${profile.handle.toUpperCase()} · JOINED ${joinedYear}`,
    isSelf,
    audienceLine,
    counts: {
      videos: videos.length,
      verdicts: verdicts.length,
      reports: reportRows.length,
      calls: predictions.length,
    },
    videos,
    pinned,
    verdicts,
    reports: reportRows,
    predictions,
    analystId: profile.id,
    initialFollowing: following,
    isAuthed: Boolean(userId),
    subscribeLabel,
    plans,
    balance: wallet?.balance ?? 0,
    storefrontStyle,
    texture: Boolean(config.texture),
  };
}
