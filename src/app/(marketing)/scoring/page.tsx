import type { Metadata } from "next";
import Link from "next/link";
import { GradeTag } from "@/components/ui/tag";

/** URL kept: /how-it-works redirects here, and the footer, landing, and the
 * Verdicts band all point at it. */
export const metadata: Metadata = {
  title: "How calls are graded",
  description:
    "How Stoa locks a call at publication, lets the market grade it at the horizon, and keeps every outcome visible.",
};

export default function GradingPage() {
  return (
    <article className="mx-auto max-w-[var(--w-reading)] flex flex-col gap-10 py-4">
      <header>
        <p className="t-eyebrow">Transparency</p>
        <h1 className="t-display mt-2 text-4xl">How calls are graded</h1>
        <p className="t-body mt-4 text-lg">
          Stoa does not rate its analysts. It records what they called, and what the market did
          about it. A call locks at publication, resolves against real prices at the horizon the
          analyst set, and stays on the page afterwards whether it hit or missed.
        </p>
      </header>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">The loop</h2>
        <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-text-mute">
          <li>
            An analyst publishes a call with a ticker, a direction, an optional target, and a
            horizon they choose themselves.
          </li>
          <li>
            Stoa locks the entry price from the live feed at the moment of publication and captures
            SPY alongside it, so the same window can be measured against the market later.
          </li>
          <li>
            The locked call is immutable in the database. A trigger rejects the edit, so neither the
            analyst nor Stoa can move a target or a date after the fact.
          </li>
          <li>
            When the horizon closes, the grading job fetches the resolved price and assigns an
            outcome. It joins the analyst&apos;s public call history and stays there.
          </li>
        </ol>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">Outcomes</h2>
        <div className="mt-4 flex flex-col gap-3">
          {(
            [
              { outcome: "hit" as const, text: "Moved with the call and reached target (or +5% if no target)." },
              { outcome: "near" as const, text: "Moved with the call but fell short of target." },
              { outcome: "partial" as const, text: "Roughly flat within the neutral band." },
              { outcome: "miss" as const, text: "Moved against the stated direction." },
              { outcome: "open" as const, text: "Still within the published horizon." },
            ] as const
          ).map((row) => (
            <div key={row.outcome} className="flex items-start gap-3 text-sm">
              <GradeTag outcome={row.outcome} />
              <span className="text-text-mute">{row.text}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="record" className="scroll-mt-20 rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">What you see on a resolved call</h2>
        <ul className="mt-4 space-y-3 text-sm text-text-mute">
          <li>
            <strong className="text-text">The entry price</strong>, locked and attested at
            publication, not recalled afterwards.
          </li>
          <li>
            <strong className="text-text">The exit price</strong> the market closed at when the
            horizon ended.
          </li>
          <li>
            <strong className="text-text">The return</strong>, signed for direction, so a short that
            worked reads as a gain.
          </li>
          <li>
            <strong className="text-text">Alpha</strong>, the same call measured against the S&amp;P
            over the same window, so a rising tide is not mistaken for a good call.
          </li>
          <li>
            <strong className="text-text">The outcome seal</strong>, hit, near, partial, or miss.
          </li>
        </ul>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">Nothing is quietly removed</h2>
        <p className="t-body mt-3">
          A miss sits in the same table as a hit, with the same fields filled in. Analysts cannot
          delete a call, cannot edit one after publication, and cannot sort their weaker calls out
          of view. Deleting a record is not a feature we withheld; it is one the database refuses.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
        <h2 className="t-h2">What we deliberately do not publish</h2>
        <p className="t-body mt-3">
          A score. A rating. A percentile. A leaderboard of analysts ranked against each other.
          Compressing someone&apos;s work into a single number invites you to skip the work, and it
          tells you less than the calls themselves do. We publish the calls and the outcomes, and
          leave the judgment where it belongs.
        </p>
        <p className="t-body mt-4">
          Firm prestige, follower count, media appearances, and self-reported win rates count for
          nothing here either. Only calls that went through the lock-and-grade pipeline appear at
          all.
        </p>
        <p className="t-meta mt-4">
          Commentary and short posts are never graded. Only publications carrying a locked call are.
        </p>
      </section>

      <p className="t-meta">
        Read the record for yourself in{" "}
        <Link href="/discover" className="text-text underline hover:no-underline">
          Discover
        </Link>
        .
      </p>
    </article>
  );
}
