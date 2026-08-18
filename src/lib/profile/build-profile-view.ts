import type { CSSProperties } from "react";
import { format } from "date-fns";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { listByAuthor } from "@/lib/db/reports";
import { listReadyClipsByCreator } from "@/lib/db/video-clips";
import { listTickerRows } from "@/lib/db/tickers";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, subscriberCount } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listActivePlans } from "@/lib/db/plans";
import { pct, compact, usd } from "@/lib/format";
import { accentVars, checkAccent } from "@/lib/profile/accent";
import { fontPairingVars } from "@/lib/profile/fonts";
import type { Direction, Prediction, Report } from "@/lib/types";
import type { VideoClip } from "@/lib/db/video-clips";
import type {
  AnalystProfileViewProps,
  ProfilePublication,
  ProfileSubject,
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

function typeLabel(type: Report["type"]): ProfilePublication["typeLabel"] {
  if (type === "research") return "RESEARCH";
  if (type === "short_post") return "NOTE";
  return "CALL";
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The content badge states exactly what a publication contains, built only
 * from what is stored: a ready video clip, a locked call, a written thesis.
 * Cards are not persisted per publication yet, so they never appear here.
 * CONTENT_BADGE_PLACEHOLDER: add CARDS once evidence cards are stored.
 */
export function contentBadge(input: { hasVideo: boolean; hasCall: boolean; hasThesis: boolean }): string {
  const parts: string[] = [];
  if (input.hasVideo) parts.push("VIDEO");
  if (input.hasCall) parts.push("CALL");
  if (input.hasThesis) parts.push("THESIS");
  return parts.length ? parts.join(" · ") : "NOTE";
}

/** Sector label as a theme tag: "Information Technology" -> "INFORMATION TECHNOLOGY". */
function sectorTag(sector: string | null | undefined): string | null {
  const s = sector?.trim();
  return s ? s.toUpperCase() : null;
}

/**
 * Turns an analyst's reports, calls and video clips into the one publication
 * shape the storefront renders. Shared with the /dev/profile fixture so the
 * fixture goes through exactly the same rules as live data.
 */
export function buildPublications(input: {
  reports: Report[];
  predictions: Prediction[];
  clips: VideoClip[];
  sectorByTicker: Map<string, string | null>;
}): ProfilePublication[] {
  const predByReport = new Map<string, Prediction>();
  for (const p of input.predictions) if (!predByReport.has(p.report_id)) predByReport.set(p.report_id, p);
  const clipByReport = new Map<string, VideoClip>();
  for (const c of input.clips) if (!clipByReport.has(c.report_id)) clipByReport.set(c.report_id, c);

  return input.reports.map((r) => {
    const pred = predByReport.get(r.id) ?? null;
    const clip = clipByReport.get(r.id) ?? null;
    const hasCall = Boolean(pred);
    const hasThesis = r.type === "research" || (r.body?.length ?? 0) > 600;
    const when = r.published_at ?? r.created_at;
    const resolved =
      pred && ["hit", "near", "miss", "partial"].includes(pred.outcome) && pred.lock_price && pred.resolved_price != null
        ? pred
        : null;

    // Anchoring rule: only a call earns a ticker + direction. A callless item
    // anchors on a theme tag; the closest stored fact is the ticker's sector.
    // THEME_TAG_PLACEHOLDER: swap for the publication's own theme tag once stored.
    const themeTag = !hasCall && r.ticker ? sectorTag(input.sectorByTicker.get(r.ticker.toUpperCase())) : null;
    const subject = hasCall && pred ? pred.ticker : themeTag;

    return {
      id: r.id,
      href: `/report/${r.id}`,
      kind: clip ? "video" : "written",
      typeLabel: typeLabel(r.type),
      ticker: hasCall && pred ? pred.ticker : null,
      direction: hasCall && pred ? (pred.direction as Direction) : null,
      themeTag,
      badge: contentBadge({ hasVideo: Boolean(clip), hasCall, hasThesis }),
      title: r.title ?? "Untitled",
      deck: r.summary,
      duration: clip ? formatDuration(clip.duration_seconds) : null,
      thumbnailUrl: clip?.thumbnail_url ?? null,
      dateISO: when,
      dateLabel: format(new Date(when), "MMM d, yyyy").toUpperCase(),
      views: r.views ?? 0,
      seal: resolved
        ? {
            status: resolved.outcome === "hit" ? "hit" : resolved.outcome === "near" ? "near" : "miss",
            dateISO: resolved.resolution_trading_date ?? resolved.resolves_at,
            entryExit: `${resolved.lock_price.toFixed(2)} → ${resolved.resolved_price?.toFixed(2)}`,
            retLabel: resolved.return_pct == null ? "—" : pct(resolved.return_pct),
            retTone: resolved.return_pct == null ? "neutral" : resolved.return_pct > 0 ? "up" : resolved.return_pct < 0 ? "down" : "neutral",
          }
        : null,
      subject,
    };
  });
}

/**
 * Splits publications into the three tiers. Tier 1 is the pinned publication
 * or the newest one with a video (falling back to the newest of anything).
 * Tier 2 is the most-watched videos beyond the lead, only when there are
 * enough to make a row. Tier 3 is the complete archive, shown once there is
 * more than the lead. Subjects are the tickers and themes actually covered.
 */
export function tierPublications(publications: ProfilePublication[], pinnedId: string | null) {
  const pinned = pinnedId ? publications.find((p) => p.id === pinnedId) ?? null : null;
  const lead = pinned ?? publications.find((p) => p.kind === "video") ?? publications[0] ?? null;

  const mostWatchedPool = publications
    .filter((p) => p.kind === "video" && p.id !== lead?.id && p.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);
  const mostWatched = mostWatchedPool.length >= 3 ? mostWatchedPool : [];

  const everything = publications.length >= 2 ? publications : [];

  const counts = new Map<string, number>();
  for (const p of publications) if (p.subject) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);
  const subjects: ProfileSubject[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

  return {
    lead,
    leadLabel: (pinned ? "PINNED" : "LATEST") as "PINNED" | "LATEST",
    mostWatched,
    everything,
    subjects: subjects.length >= 2 ? subjects : [],
  };
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

  const [predictions, reports, clips, userId, plans] = await Promise.all([
    listPredictionsByAuthor(profile.id),
    listByAuthor(profile.id, { status: "published" }),
    listReadyClipsByCreator(profile.id),
    getSessionUserId(),
    listActivePlans(profile.id),
  ]);

  const isSelf = userId === profile.id;
  const config = profile.profile_config ?? {};
  const showMembers = config.show_member_count === true;

  const calledReportIds = new Set(predictions.map((p) => p.report_id));
  const callessTickers = [
    ...new Set(
      reports.filter((r) => r.ticker && !calledReportIds.has(r.id)).map((r) => r.ticker!.toUpperCase()),
    ),
  ];

  const [following, wallet, members, tickerRows] = await Promise.all([
    userId ? isFollowing(userId, profile.id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
    showMembers ? subscriberCount(profile.id) : Promise.resolve(0),
    callessTickers.length ? listTickerRows(callessTickers) : Promise.resolve([]),
  ]);

  const sectorByTicker = new Map<string, string | null>();
  for (const row of tickerRows) sectorByTicker.set(row.symbol.toUpperCase(), row.sector);

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

  const publications = buildPublications({ reports, predictions, clips, sectorByTicker });
  const tiers = tierPublications(publications, config.pinned_report_id ?? null);

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
    ...tiers,
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
