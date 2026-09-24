import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format, formatDistanceToNowStrict } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { editedAtByReport } from "@/lib/db/report-edits";
import { listByAuthor } from "@/lib/db/reports";
import { listClipsByCreator } from "@/lib/db/video-clips";
import { soldReportIds } from "@/lib/db/report-unlocks";
import { deleteBlocker } from "@/lib/studio/delete-rule";
import { formatDuration } from "@/lib/profile/build-profile-view";
import { compact } from "@/lib/format";
import { publicTypeLabel } from "@/lib/compose/modes";
import type { Report } from "@/lib/types";
import { PublicationsView, type Publication, type PubState } from "@/components/studio/publications-view";

export const metadata: Metadata = { title: "Publications" };

function typeLabel(type: Report["type"]): string {
  return publicTypeLabel(type);
}
/** Only what is stored: a ready clip, a written thesis. */
function badgeFor(r: Report, hasVideo: boolean): string {
  const parts: string[] = [];
  if (hasVideo) parts.push("VIDEO");
  if (r.type === "research" || (r.body?.length ?? 0) > 600) parts.push("THESIS");
  return parts.length ? parts.join(" · ") : "NOTE";
}

type Clip = Awaited<ReturnType<typeof listClipsByCreator>>[number];

/**
 * Module level so the page component stays pure: the state lines read the
 * clock, and render must not depend on when it ran.
 */
function toPublication(
  r: Report,
  clip: Clip | undefined,
  pinnedId: string | null,
  editedAt: string | null,
  sold: boolean,
): Publication {
  let state: PubState = "published";
  if (r.status === "archived") state = "archived";
  else if (r.status === "draft") state = "draft";

  const base: Publication = {
    id: r.id,
    href: `/report/${r.id}`,
    editHref: `/studio/compose?id=${r.id}`,
    state,
    deletable: deleteBlocker({ hasStance: Boolean(r.stance), sold }) === null,
    editedAt,
    typeLabel: typeLabel(r.type),
    tag: r.ticker,
    tagIsTicker: Boolean(r.ticker),
    // The badge says what the publication contains. With nothing to list it
    // falls back to NOTE, which the type label already says, so it is dropped
    // rather than printed twice.
    badge: badgeFor(r, clip?.status === "ready") === typeLabel(r.type)
      ? ""
      : badgeFor(r, clip?.status === "ready"),
    title: r.title?.trim() || r.summary?.trim() || "Untitled",
    duration: clip?.status === "ready" ? formatDuration(clip.duration_seconds) : "",
    videoStatus: clip ? clip.status : null,
    dateLabel: format(new Date(r.published_at ?? r.created_at), "MMM d").toUpperCase(),
    views: compact(r.views),
    plays: clip ? compact(clip.play_count ?? 0) : null,
    pinned: r.id === pinnedId,
    stateLine: null,
  };

  if (clip?.status === "processing") {
    base.stateLine = `VIDEO PROCESSING · STARTED ${formatDistanceToNowStrict(new Date(clip.created_at)).toUpperCase()} AGO`;
  }
  if (clip?.status === "failed") {
    base.stateLine = "VIDEO FAILED · OPEN IT AND ATTACH THE CLIP AGAIN";
  }
  if (state === "archived") {
    base.stateLine = "ARCHIVED · HIDDEN FROM THE PUBLIC · CAN BE RESTORED";
  } else if (state === "draft") {
    base.stateLine = `DRAFT · EDITED ${formatDistanceToNowStrict(new Date(r.created_at)).toUpperCase()} AGO`;
  }

  return base;
}

export default async function PublicationsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const [reports, clips] = await Promise.all([
    listByAuthor(profile.id, { limit: 100 }),
    listClipsByCreator(profile.id),
  ]);

  const clipByReport = new Map(clips.map((c) => [c.report_id, c] as const));
  const pinnedId = profile.profile_config?.pinned_report_id ?? null;

  const [editedAt, sold] = await Promise.all([
    editedAtByReport(reports.map((r) => r.id)),
    soldReportIds(reports.filter((r) => r.status !== "draft").map((r) => r.id)),
  ]);

  const pubs: Publication[] = reports.map((r) =>
    toPublication(
      r,
      clipByReport.get(r.id),
      pinnedId,
      editedAt.get(r.id) ?? null,
      sold.has(r.id),
    ),
  );

  return (
    <div className="mx-auto w-full max-w-[var(--w-wide)]">
      <PublicationsView pubs={pubs} />
    </div>
  );
}
