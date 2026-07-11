import Link from "next/link";
import { LandingCallChip } from "@/components/landing/landing-call-chip";
import type { ResolvedCall } from "@/lib/db/predictions";

/* A deliberate mix: the honesty is the pitch, so misses are never filtered
 * out. Two hits, two misses when the ledger has them. */
function pickMix(calls: ResolvedCall[], count = 4): ResolvedCall[] {
  const hits = calls.filter((c) => c.outcome === "hit" || c.outcome === "near");
  const misses = calls.filter((c) => c.outcome === "miss");
  const rest = calls.filter((c) => !hits.includes(c) && !misses.includes(c));
  const mix = [...hits.slice(0, 2), ...misses.slice(0, 2), ...rest];
  const seen = new Set<string>();
  return mix.filter((c) => (seen.has(c.id) ? false : seen.add(c.id))).slice(0, count);
}

export function LandingLedgerProof({ calls }: { calls: ResolvedCall[] }) {
  const picks = pickMix(calls);
  if (picks.length === 0) return null;

  return (
    <section className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="scrub-in">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl" style={{ textWrap: "balance" }}>
            The ledger shows everything
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-text-mute">
            These are real graded calls, straight from the record. Misses stay up next to the
            hits, forever. That is what makes the hits mean something.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {picks.map((call) => (
            <LandingCallChip key={call.id} call={call} className="scrub-in" />
          ))}
        </div>

        <p className="t-meta mt-8">
          <Link href="/leaderboard" className="underline transition-colors hover:text-text">
            See who is actually right
          </Link>{" "}
          on the leaderboard.
        </p>
      </div>
    </section>
  );
}
