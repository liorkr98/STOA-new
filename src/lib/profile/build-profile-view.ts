import type { CSSProperties } from "react";
import { format } from "date-fns";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listByAuthor } from "@/lib/db/reports";
import { listReadyClipsByCreator } from "@/lib/db/video-clips";
import { listPendingClipsByCreator } from "@/lib/db/video-clips";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, isSubscribed, subscriberCount } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listActivePlans } from "@/lib/db/plans";
import { compact, usd } from "@/lib/format";
import { publicTypeLabel } from "@/lib/compose/modes";
import { themeLabel } from "@/lib/tags/taxonomy";
import { reportIdsWithCards } from "@/lib/db/publication-cards";
import { fontPairingVars } from "@/lib/profile/fonts";
import type { Report } from "@/lib/types";
import type { VideoClip } from "@/lib/db/video-clips";
import type {
  AnalystProfileViewProps,
  ProfilePublication,
  ProfileSubject,
} from "@/components/profile/analyst-profile-view";
import { stanceChips } from "@/lib/db/publication-row";

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
  return publicTypeLabel(type);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * The content badge states exactly what a publication contains, built only from
 * what is stored: a ready video clip, a written thesis, an evidence stack. Nothing is claimed that a reader cannot then find.
 */
export function contentBadge(input: {
  hasVideo: boolean;
  hasThesis: boolean;
  hasCards?: boolean;
}): string {
  const parts: string[] = [];
  if (input.hasVideo) parts.push("VIDEO");
  if (input.hasThesis) parts.push("THESIS");
  if (input.hasCards) parts.push("CARDS");
  return parts.length ? parts.join(" · ") : "NOTE";
}

/**
 * Turns an analyst's reports and video clips into the one publication
 * shape the storefront renders. Shared with the /dev/profile fixture so the
 * fixture goes through exactly the same rules as live data.
 */
export function buildPublications(input: {
  reports: Report[];
  clips: VideoClip[];
  /** Publications with a stored evidence stack. Omitted by the dev fixture. */
  cardIds?: Set<string>;
  /** Publications whose clip exists but is not live yet. */
  pendingClipIds?: Set<string>;
}): ProfilePublication[] {
  const clipByReport = new Map<string, VideoClip>();
  for (const c of input.clips) if (!clipByReport.has(c.report_id)) clipByReport.set(c.report_id, c);

  return input.reports.map((r) => {
    const clip = clipByReport.get(r.id) ?? null;
    const pending = !clip && Boolean(input.pendingClipIds?.has(r.id));
    const hasThesis = r.type === "research" || (r.body?.length ?? 0) > 600;
    const when = r.published_at ?? r.created_at;

    // Anchoring rule: a publication shows its own ticker and stance. A
    // tickerless item anchors on its own theme tag.
    const chips = stanceChips(r);
    const themeTag = chips.ticker ? null : themeLabel(r);
    const subject = chips.ticker ?? themeTag;

    return {
      id: r.id,
      href: `/report/${r.id}`,
      kind: clip || pending ? "video" : "written",
      processing: pending,
      typeLabel: typeLabel(r.type),
      ticker: chips.ticker,
      direction: chips.direction,
      themeTag,
      badge: contentBadge({
        hasVideo: Boolean(clip) || pending,
        hasThesis,
        hasCards: input.cardIds?.has(r.id) ?? false,
      }),
      title: r.title ?? "Untitled",
      deck: r.summary,
      duration: clip ? formatDuration(clip.duration_seconds) : null,
      thumbnailUrl: clip?.thumbnail_url ?? null,
      dateISO: when,
      dateLabel: format(new Date(when), "MMM d, yyyy"),
      subject,
    };
  });
}

/**
 * Orders the storefront. The lead is the pinned publication, or else the
 * newest thing published, whatever its form: the page argues for a
 * subscription with the work itself, so it opens on the latest of it. The
 * archive is everything, lead included; the view leaves the lead out until a
 * filter is chosen. Subjects are the tickers and themes actually covered, and
 * types the publication types actually used, each offered only when there is
 * more than one to choose between.
 */
export function orderPublications(all: ProfilePublication[], pinnedId: string | null) {
  // By publication date, not by when the draft was started.
  const publications = [...all].sort((a, b) => b.dateISO.localeCompare(a.dateISO));
  const pinned = pinnedId ? publications.find((p) => p.id === pinnedId) ?? null : null;
  const lead = pinned ?? publications[0] ?? null;

  const counts = new Map<string, number>();
  for (const p of publications) if (p.subject) counts.set(p.subject, (counts.get(p.subject) ?? 0) + 1);
  const subjects: ProfileSubject[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([key, count]) => ({ key, count }));

  const types = TYPE_ORDER.filter((t) => publications.some((p) => p.typeLabel === t));

  return {
    lead,
    leadLabel: (pinned ? "Pinned" : "Latest") as "Pinned" | "Latest",
    publications,
    subjects: subjects.length >= 2 ? subjects : [],
    types: types.length >= 2 ? types : [],
  };
}

const TYPE_ORDER: ProfilePublication["typeLabel"][] = ["VIDEO", "BRIEF", "THESIS"];

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

  const [reports, clips, pendingClips, userId, plans] = await Promise.all([
    listByAuthor(profile.id, { status: "published", limit: 500 }),
    listReadyClipsByCreator(profile.id),
    listPendingClipsByCreator(profile.id),
    getSessionUserId(),
    listActivePlans(profile.id),
  ]);

  const isSelf = userId === profile.id;
  const config = profile.profile_config ?? {};
  const showMembers = config.show_member_count === true;

  const [following, subscribed, wallet, members] = await Promise.all([
    userId ? isFollowing(userId, profile.id) : Promise.resolve(false),
    userId && !isSelf ? isSubscribed(userId, profile.id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
    showMembers ? subscriberCount(profile.id) : Promise.resolve(0),
  ]);

  // The storefront's own style (the Storefront editor's Style tab): the
  // headline face and the optional paper texture, on the profile subtree only.
  const storefrontStyle = fontPairingVars(config.font_pairing) as CSSProperties;
  const name = profile.display_name;
  const firstName = name.split(/\s+/)[0] || name;

  // The only two audience numbers shown anywhere on the platform. Followers is
  // always present; members (paying subscribers) only when the analyst opted in
  // from the Storefront.
  const audienceLine = [
    `@${profile.handle}`,
    `${compact(profile.followers_count)} ${profile.followers_count === 1 ? "follower" : "followers"}`,
    ...(showMembers ? [`${compact(members)} ${members === 1 ? "member" : "members"}`] : []),
  ].join(" · ");

  const cardIds = await reportIdsWithCards(reports.map((r) => r.id));
  const publications = buildPublications({
    reports,
    clips,
    cardIds,
    pendingClipIds: new Set(pendingClips.keys()),
  });
  const ordered = orderPublications(publications, config.pinned_report_id ?? null);

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
    isSelf,
    audienceLine,
    ...ordered,
    analystId: profile.id,
    initialFollowing: following,
    subscribed,
    isAuthed: Boolean(userId),
    subscribeLabel,
    plans,
    balance: wallet?.balance ?? 0,
    storefrontStyle,
    texture: Boolean(config.texture),
  };
}
