import type { CSSProperties } from "react";
import { format } from "date-fns";
import { getProfileByHandle } from "@/lib/db/profiles";
import { listByAuthor } from "@/lib/db/reports";
import { listReadyClipsByCreator } from "@/lib/db/video-clips";
import { listPendingClipsByCreator } from "@/lib/db/video-clips";
import { getSessionUserId } from "@/lib/db/auth";
import { isFollowing, subscriberCount } from "@/lib/db/social";
import { getWallet } from "@/lib/db/wallet";
import { listActivePlans } from "@/lib/db/plans";
import { compact, usd } from "@/lib/format";
import { publicTypeLabel } from "@/lib/compose/modes";
import { themeLabel } from "@/lib/tags/taxonomy";
import { reportIdsWithCards } from "@/lib/db/publication-cards";
import { accentVars, checkAccent } from "@/lib/profile/accent";
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
      dateLabel: format(new Date(when), "MMM d, yyyy").toUpperCase(),
      views: r.views ?? 0,
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

  const [reports, clips, pendingClips, userId, plans] = await Promise.all([    listByAuthor(profile.id, { status: "published" }),
    listReadyClipsByCreator(profile.id),
    listPendingClipsByCreator(profile.id),
    getSessionUserId(),
    listActivePlans(profile.id),
  ]);

  const isSelf = userId === profile.id;
  const config = profile.profile_config ?? {};
  const showMembers = config.show_member_count === true;

  const [following, wallet, members] = await Promise.all([
    userId ? isFollowing(userId, profile.id) : Promise.resolve(false),
    userId ? getWallet(userId) : Promise.resolve(null),
    showMembers ? subscriberCount(profile.id) : Promise.resolve(0),
  ]);

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

  const cardIds = await reportIdsWithCards(reports.map((r) => r.id));
  const publications = buildPublications({
    reports,
    clips,
    cardIds,
    pendingClipIds: new Set(pendingClips.keys()),
  });
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
