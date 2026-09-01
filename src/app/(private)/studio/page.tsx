import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { format, formatDistanceToNowStrict, differenceInCalendarDays } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { listByAuthor } from "@/lib/db/reports";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { listClipsByCreator } from "@/lib/db/video-clips";
import { formatDuration } from "@/lib/profile/build-profile-view";
import { compact, pct } from "@/lib/format";
import { publicTypeLabel } from "@/lib/compose/modes";
import type { Prediction, Report } from "@/lib/types";
import { PublicationsView, type Publication, type PubState } from "@/components/studio/publications-view";

export const metadata: Metadata = { title: "Publications" };

function typeLabel(type: Report["type"]): string {
  return publicTypeLabel(type);
}
/** Only what is stored: a ready clip, a locked call, a written thesis. */
function badgeFor(r: Report, hasVideo: boolean, hasCall: boolean): string {
  const parts: string[] = [];
  if (hasVideo) parts.push("VIDEO");
  if (hasCall) parts.push("CALL");
  if (r.type === "research" || (r.body?.length ?? 0) > 600) parts.push("THESIS");
  return parts.length ? parts.join(" · ") : "NOTE";
}

type Clip = Awaited<ReturnType<typeof listClipsByCreator>>[number];

/**
 * Module level so the page component stays pure: this reads the clock to work
 * out how far an open call has run, and render must not depend on when it ran.
 */
function toPublication(
  r: Report,
  pred: Prediction | undefined,
  clip: Clip | undefined,
  pinnedId: string | null,
): Publication {
  let state: PubState = "published";
  if (r.status === "archived") state = "archived";
  else if (r.status === "draft") state = "draft";
  else if (pred && pred.outcome === "open") state = "open";
  else if (pred && ["hit", "near", "miss", "partial"].includes(pred.outcome)) state = "resolved";

  const base: Publication = {
    id: r.id,
    href: `/report/${r.id}`,
    editHref: `/studio/compose?id=${r.id}`,
    state,
    hasCall: Boolean(pred),
    typeLabel: typeLabel(r.type),
    tag: r.ticker,
    tagIsTicker: Boolean(r.ticker),
    // The badge says what the publication contains. With nothing to list it
    // falls back to NOTE, which the type label already says, so it is dropped
    // rather than printed twice.
    badge: badgeFor(r, clip?.status === "ready", Boolean(pred)) === typeLabel(r.type)
      ? ""
      : badgeFor(r, clip?.status === "ready", Boolean(pred)),
    title: r.title?.trim() || r.summary?.trim() || "Untitled",
    duration: clip?.status === "ready" ? formatDuration(clip.duration_seconds) : "",
    videoStatus: clip ? clip.status : null,
    dateLabel: format(new Date(r.published_at ?? r.created_at), "MMM d").toUpperCase(),
    views: compact(r.views),
    unlocks: "—", // placeholder
    revenue: "—", // placeholder
    pinned: r.id === pinnedId,
    stateLine: null,
  };

  if (clip?.status === "processing") {
    base.stateLine = `VIDEO PROCESSING · STARTED ${formatDistanceToNowStrict(new Date(clip.created_at)).toUpperCase()} AGO`;
  }
  if (state === "archived") {
    base.stateLine = "ARCHIVED · HIDDEN FROM THE PUBLIC · CAN BE RESTORED";
  } else if (state === "draft") {
    base.stateLine = `DRAFT · EDITED ${formatDistanceToNowStrict(new Date(r.created_at)).toUpperCase()} AGO`;
  } else if (state === "open" && pred) {
    const days = Math.max(0, differenceInCalendarDays(new Date(pred.resolves_at), new Date()));
    base.warning = days <= 3;
    base.stateLine = `OPEN · RESOLVES IN ${days} DAY${days === 1 ? "" : "S"}`;
    base.entry = pred.lock_price?.toFixed(2) ?? "—";
    base.target = pred.target_price?.toFixed(2) ?? "—";
    // Placeholder progress: time elapsed toward resolution (true distance-to-target needs a live price).
    const start = new Date(r.published_at ?? r.created_at).getTime();
    const end = new Date(pred.resolves_at).getTime();
    const now = Date.now();
    base.progressPct = end > start ? Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100)) : 0;
  } else if (state === "resolved" && pred) {
    base.entryExit = `${pred.lock_price?.toFixed(2)} → ${pred.resolved_price?.toFixed(2)}`;
    base.returnPct = pred.return_pct != null ? pct(pred.return_pct) : "—";
    base.returnTone = (pred.return_pct ?? 0) >= 0 ? "up" : "down";
    base.sealStatus = pred.outcome === "hit" ? "hit" : pred.outcome === "near" ? "near" : "miss";
  }

  return base;
}

export default async function PublicationsPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  const [reports, predictions, clips] = await Promise.all([
    listByAuthor(profile.id, { limit: 100 }),
    listPredictionsByAuthor(profile.id),
    listClipsByCreator(profile.id),
  ]);

  const predByReport = new Map<string, Prediction>();
  for (const p of predictions) if (!predByReport.has(p.report_id)) predByReport.set(p.report_id, p);
  const clipByReport = new Map(clips.map((c) => [c.report_id, c] as const));
  const pinnedId = profile.profile_config?.pinned_report_id ?? null;


  const pubs: Publication[] = reports.map((r) =>
    toPublication(r, predByReport.get(r.id), clipByReport.get(r.id), pinnedId),
  );

  return (
    <div className="mx-auto w-full max-w-[var(--w-wide)]">
      <PublicationsView pubs={pubs} />
    </div>
  );
}
