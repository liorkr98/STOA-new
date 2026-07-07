import Link from "next/link";
import type { Metadata } from "next";
import { formatDistanceToNow } from "date-fns";
import { PencilSimpleLine, PlusCircle } from "@phosphor-icons/react/dist/ssr";
import { getSessionProfile } from "@/lib/db/auth";
import { listByAuthor } from "@/lib/db/reports";
import { listActivePlans } from "@/lib/db/plans";
import { listPredictionsByAuthor } from "@/lib/db/predictions";
import { getWallet } from "@/lib/db/wallet";
import { subscriberCount } from "@/lib/db/social";
import { analystStats } from "@/lib/engine/track";
import { compact, usd, pct } from "@/lib/format";
import { buttonClass } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { GradeTag } from "@/components/ui/tag";
import { MoatBadge } from "@/components/ui/moat-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { StudioPublishedList } from "@/components/studio/studio-published-list";

export const metadata: Metadata = { title: "Studio" };

export default async function StudioOverview() {
  const profile = (await getSessionProfile())!;
  const [reports, predictions, wallet, subs, plans] = await Promise.all([
    listByAuthor(profile.id, { limit: 100 }),
    listPredictionsByAuthor(profile.id),
    getWallet(profile.id),
    subscriberCount(profile.id),
    listActivePlans(profile.id),
  ]);

  const stats = analystStats(predictions);
  const published = reports.filter((r) => r.status === "published");
  const drafts = reports.filter((r) => r.status === "draft");
  const openCalls = predictions.filter((p) => p.outcome === "open");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="t-h1">Studio</h1>
          <p className="t-body mt-1">Welcome back, {profile.display_name}.</p>
        </div>
        <Link href="/studio/compose" className={buttonClass("primary", "lg")}>
          <PlusCircle size={18} weight="bold" />
          New publication
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-5 md:grid-cols-4">
        <MoatBadge
          handle={profile.handle}
          score={stats.score || null}
          hitRate={stats.winRate}
          sampleSize={stats.resolved}
          size="lg"
          className="col-span-2"
        />
        <div className="col-span-2 grid grid-cols-3 gap-5 rounded-[var(--radius-card)] border border-border bg-surface p-5">
          <Stat label="Subscribers" value={compact(subs)} />
          <Stat label="Earnings" value={usd(wallet?.earnings ?? 0)} />
          <Stat
            label="Avg return"
            value={pct(stats.avgReturn)}
            tone={stats.avgReturn == null ? "neutral" : stats.avgReturn >= 0 ? "up" : "down"}
          />
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="t-h3 mb-3">Open calls</h2>
          {openCalls.length > 0 ? (
            <ul className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
              {openCalls.slice(0, 6).map((p) => (
                <li key={p.id} className="border-b border-border last:border-0">
                  <Link
                    href={`/report/${p.report_id}`}
                    className="flex items-center justify-between px-5 py-3 hover:bg-surface-2"
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
                  </Link>
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
          <StudioPublishedList reports={published} plans={plans} />
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
