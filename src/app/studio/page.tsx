import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { PencilSimpleLine, PlusCircle } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { listByAuthor } from "@/lib/db/reports";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { getWallet } from "@/lib/db/wallet";
import { subscriberCount } from "@/lib/db/social";
import { analystStats } from "@/lib/engine/track";
import { compact, usd, pct } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { GradeTag } from "@/components/ui/tag";
import { TierBadge } from "@/components/ui/tier-badge";
import { EmptyState } from "@/components/ui/empty-state";

export const metadata: Metadata = { title: "Studio" };

export default async function StudioOverview() {
  const profile = (await getSessionProfile())!;
  const [reports, predictions, wallet, subs] = await Promise.all([
    listByAuthor(profile.id, { limit: 100 }),
    listPredictionsByAuthor(profile.id),
    getWallet(profile.id),
    subscriberCount(profile.id),
  ]);

  const stats = analystStats(predictions);
  const published = reports.filter((r) => r.status === "published");
  const drafts = reports.filter((r) => r.status === "draft");
  const openCalls = predictions.filter((p) => p.outcome === "open");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="t-h1">Studio</h1>
          <p className="t-body mt-1 flex items-center gap-2">
            Welcome back, {profile.display_name}.
            <TierBadge tier={stats.tier.key} label={stats.tier.label} />
          </p>
        </div>
        <Link href="/studio/compose" className={buttonClass("primary", "lg")}>
          <PlusCircle size={18} weight="bold" />
          New publication
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-6 md:grid-cols-4">
        <Stat label="Rating" value={String(stats.rating)} sub={`Score ${stats.score} / 100`} />
        <Stat label="Subscribers" value={compact(subs)} />
        <Stat label="Earnings" value={usd(wallet?.earnings ?? 0)} />
        <Stat
          label="Avg return"
          value={pct(stats.avgReturn)}
          tone={stats.avgReturn == null ? "neutral" : stats.avgReturn >= 0 ? "up" : "down"}
        />
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="t-h3 mb-3">Open calls</h2>
          {openCalls.length > 0 ? (
            <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
              {openCalls.slice(0, 6).map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="num font-semibold">{p.ticker}</span>
                    <span className="t-meta capitalize">{p.direction}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="t-meta">
                      resolves {formatDistanceToNow(new Date(p.resolves_at), { addSuffix: true })}
                    </span>
                    <GradeTag outcome="open" />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No open calls" body="Publish a call to start your track record." />
          )}
        </div>

        <div>
          <h2 className="t-h3 mb-3">Drafts</h2>
          {drafts.length > 0 ? (
            <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
              {drafts.slice(0, 6).map((d) => (
                <li key={d.id} className="flex items-center justify-between border-b border-border px-5 py-3 last:border-0">
                  <span className="truncate text-sm">{d.title || "Untitled draft"}</span>
                  <Link href={`/studio/compose?id=${d.id}`} className="text-text-faint hover:text-text">
                    <PencilSimpleLine size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No drafts" />
          )}
        </div>
      </section>

      <section>
        <h2 className="t-h3 mb-3">Published ({published.length})</h2>
        {published.length > 0 ? (
          <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
            {published.map((r) => (
              <li key={r.id} className="flex items-center justify-between border-b border-border px-5 py-3.5 last:border-0">
                <Link href={`/report/${r.id}`} className="truncate text-sm font-medium hover:text-accent">
                  {r.title || r.summary || "Untitled"}
                </Link>
                <span className="t-meta flex items-center gap-3">
                  <span className="num">{compact(r.views)} views</span>
                  <span className="num">{compact(r.likes)} likes</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nothing published yet"
            body="Your first report or call will appear here and start feeding your track record."
            action={
              <Link href="/studio/compose" className={buttonClass("primary", "md")}>
                Compose your first publication
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
