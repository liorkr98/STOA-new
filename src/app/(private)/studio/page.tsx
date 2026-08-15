import type { Metadata } from "next";
import { format, formatDistanceToNowStrict, differenceInCalendarDays } from "date-fns";
import { getSessionProfile } from "@/lib/db/auth";
import { listByAuthor } from "@/lib/db/reports";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { compact, pct } from "@/lib/format";
import type { Prediction, Report } from "@/lib/types";
import { PublicationsView, type Publication, type PubState } from "@/components/studio/publications-view";

export const metadata: Metadata = { title: "Publications" };

function typeLabel(type: Report["type"]): string {
  if (type === "research") return "RESEARCH";
  if (type === "short_post") return "NOTE";
  return "CALL";
}
function badgeFor(type: Report["type"]): string {
  if (type === "research") return "VIDEO · THESIS";
  if (type === "short_post") return "VIDEO · NOTE";
  return "VIDEO · CALL";
}

export default async function PublicationsPage() {
  const profile = (await getSessionProfile())!;
  const [reports, predictions] = await Promise.all([
    listByAuthor(profile.id, { limit: 100 }),
    listPredictionsByAuthor(profile.id),
  ]);

  const predByReport = new Map<string, Prediction>();
  for (const p of predictions) if (!predByReport.has(p.report_id)) predByReport.set(p.report_id, p);
  const pinnedId = profile.profile_config?.pinned_report_id ?? null;

  const pubs: Publication[] = reports.map((r): Publication => {
    const pred = predByReport.get(r.id);
    let state: PubState = "published";
    if (r.status === "draft") state = "draft";
    else if (pred && pred.outcome === "open") state = "open";
    else if (pred && ["hit", "near", "miss", "partial"].includes(pred.outcome)) state = "resolved";

    const base: Publication = {
      id: r.id,
      href: `/report/${r.id}`,
      editHref: `/studio/compose?id=${r.id}`,
      state,
      typeLabel: typeLabel(r.type),
      tag: r.ticker,
      tagIsTicker: Boolean(r.ticker),
      badge: badgeFor(r.type),
      title: r.title ?? "Untitled",
      duration: "0:00", // placeholder
      dateLabel: format(new Date(r.published_at ?? r.created_at), "MMM d").toUpperCase(),
      views: compact(r.views),
      unlocks: "—", // placeholder
      revenue: "—", // placeholder
      pinned: r.id === pinnedId,
      stateLine: null,
    };

    if (state === "draft") {
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
  });

  return <PublicationsView pubs={pubs} />;
}
