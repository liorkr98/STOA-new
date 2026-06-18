import Link from "next/link";
import type { Metadata } from "next";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import { listTopAnalysts } from "@/lib/db/profiles";
import { resolvedCountByAuthor } from "@/lib/db/predictions";
import { computeTier } from "@/lib/engine/score";
import { compact, analystRating } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { TierBadge } from "@/components/ui/tier-badge";
import { EmptyState } from "@/components/ui/empty-state";
import { sampleAnalysts } from "@/lib/sample";

export const metadata: Metadata = { title: "Leaderboard" };

export default async function LeaderboardPage() {
  const raw = await listTopAnalysts(50);
  const analysts =
    raw.length > 0
      ? await Promise.all(
          raw.map(async (a) => ({ ...a, resolved: await resolvedCountByAuthor(a.id) })),
        )
      : sampleAnalysts.map((a) => ({ ...a, resolved: a.resolved }));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="t-h1">Leaderboard</h1>
        <p className="t-body mt-1">
          Ranked by verified rating (600-1400): win rate, profit factor, alpha, and consistency
          over resolved calls.
        </p>
      </div>

      {analysts.length === 0 ? (
        <EmptyState title="No analysts yet" />
      ) : (
        <ol className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {analysts.map((a, i) => {
            const tier = computeTier(a.score, a.resolved);
            return (
              <li key={a.id} className="border-b border-border last:border-0">
                <Link
                  href={`/analyst/${a.handle}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-surface-2"
                >
                  <span className="num w-6 text-center text-sm font-semibold text-text-faint">
                    {i + 1}
                  </span>
                  <Avatar src={a.avatar_url} name={a.display_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{a.display_name}</span>
                      {a.verified && <SealCheck size={13} weight="fill" className="text-accent" />}
                    </div>
                    <div className="t-meta truncate">
                      @{a.handle} · <span className="num">{compact(a.followers_count)}</span> followers
                    </div>
                  </div>
                  <TierBadge tier={tier.key} label={tier.label} className="hidden sm:inline-flex" />
                  <div className="text-right">
                    <div className="num text-lg font-semibold leading-none">{analystRating(a)}</div>
                    <div className="t-meta">
                      <span className="num">{a.resolved}</span> calls
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
