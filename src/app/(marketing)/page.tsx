import Link from "next/link";
import {
  ChartLineUp,
  LockKey,
  SealCheck,
  Scales,
  Wallet,
} from "@phosphor-icons/react/dist/ssr";
import { buttonClass } from "@/components/ui/button";
import { PredictionCard } from "@/components/prediction-card";
import { TrackChart } from "@/components/charts/track-chart";
import { AnalystCard } from "@/components/analyst-card";
import { FadeIn } from "@/components/motion/fade-in";
import { listTopAnalysts } from "@/lib/db/profiles";
import { resolvedCountByAuthor } from "@/lib/db/predictions";
import { samplePrediction, sampleTrack, sampleAnalysts } from "@/lib/sample";

export default async function LandingPage() {
  const seeded = await listTopAnalysts(3);
  const analysts =
    seeded.length > 0
      ? await Promise.all(
          seeded.map(async (a) => ({ analyst: a, resolved: await resolvedCountByAuthor(a.id) })),
        )
      : null;

  return (
    <>
      {/* Hero: asymmetric split */}
      <section className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 pt-16 pb-20 lg:grid-cols-[1.05fr_0.95fr] lg:pt-24">
        <FadeIn>
          <div className="flex flex-col gap-6">
            <span className="t-eyebrow">Independent stock research</span>
            <h1 className="t-display">
              Research you can
              <br />
              actually <span className="text-accent">verify</span>.
            </h1>
            <p className="t-body text-lg">
              Stoa scores every analyst&apos;s calls into a permanent public track record. Follow
              who is right. Pay only for what you trust.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/discover" className={buttonClass("primary", "lg")}>
                Browse analysts
              </Link>
              <Link href="/become-analyst" className={buttonClass("secondary", "lg")}>
                Publish your research
              </Link>
            </div>
          </div>
        </FadeIn>

        <FadeIn delay={0.12}>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="num font-semibold">@maren_vos</span>
                <SealCheck size={15} weight="fill" className="text-accent" />
              </div>
              <span className="t-meta inline-flex items-center gap-1.5">
                <span className="pulse-dot inline-block h-1.5 w-1.5 rounded-full bg-accent" />
                Rating 1,158
              </span>
            </div>
            <PredictionCard prediction={samplePrediction} />
            <div className="mt-4">
              <span className="t-eyebrow">Rating over resolved calls</span>
              <TrackChart data={sampleTrack} />
            </div>
          </div>
        </FadeIn>
      </section>

      {/* Why Stoa: asymmetric feature grid */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <FadeIn>
            <h2 className="t-h1 max-w-2xl">
              The track record is the product, not a vanity badge.
            </h2>
          </FadeIn>
          <div className="mt-10 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
            <FadeIn className="h-full">
              <div className="flex h-full flex-col justify-between rounded-[var(--radius-card)] border border-border bg-bg p-7">
                <Scales size={28} className="text-accent" weight="duotone" />
                <div className="mt-10">
                  <h3 className="t-h3">Every call is graded by the market, not by us</h3>
                  <p className="t-body mt-2">
                    Entry price locks the moment a call is published. When the timeframe ends, Stoa
                    pulls the real closing price and the S&amp;P benchmark, then grades the call as
                    Hit, Near, Partial, or Miss. The math is public.
                  </p>
                </div>
              </div>
            </FadeIn>
            <div className="grid gap-5">
              <FadeIn delay={0.06}>
                <div className="rounded-[var(--radius-card)] border border-border bg-bg p-7">
                  <LockKey size={24} className="text-accent" weight="duotone" />
                  <h3 className="t-h3 mt-4">Analysts own their audience</h3>
                  <p className="t-body mt-2">
                    Subscribers belong to the analyst, not the platform. If they leave, the score
                    stays.
                  </p>
                </div>
              </FadeIn>
              <FadeIn delay={0.12}>
                <div className="rounded-[var(--radius-card)] border border-border bg-bg p-7">
                  <Wallet size={24} className="text-accent" weight="duotone" />
                  <h3 className="t-h3 mt-4">Flexible monetization</h3>
                  <p className="t-body mt-2">
                    Monthly subscriptions or pay-per-report. The analyst sets the price; Stoa takes
                    10%.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* How scoring works: connected flow */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <FadeIn>
          <h2 className="t-h1 max-w-2xl">How a call becomes a score</h2>
        </FadeIn>
        <ol className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border md:grid-cols-4">
          {[
            { t: "Publish", d: "Analyst posts a call with a ticker, direction, target, and timeframe." },
            { t: "Lock", d: "Entry price locks from the live feed. No edits, no hindsight." },
            { t: "Resolve", d: "At the deadline, the closing price and benchmark are pulled automatically." },
            { t: "Grade", d: "Win rate, profit factor, and alpha update the 0-100 score and tier." },
          ].map((s, i) => (
            <FadeIn key={s.t} delay={i * 0.05}>
              <div className="flex h-full flex-col gap-3 bg-surface p-6">
                <span className="num text-2xl font-semibold text-accent">{i + 1}</span>
                <h3 className="font-semibold">{s.t}</h3>
                <p className="t-meta text-text-mute">{s.d}</p>
              </div>
            </FadeIn>
          ))}
        </ol>
      </section>

      {/* Top analysts */}
      <section className="border-t border-border bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20">
          <div className="flex items-end justify-between gap-4">
            <h2 className="t-h1">Analysts leading the board</h2>
            <Link href="/leaderboard" className="hidden text-sm text-accent hover:underline sm:block">
              View the full leaderboard
            </Link>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {analysts
              ? analysts.map(({ analyst, resolved }, i) => (
                  <FadeIn key={analyst.id} delay={i * 0.05}>
                    <AnalystCard analyst={analyst} resolvedCalls={resolved} />
                  </FadeIn>
                ))
              : sampleAnalysts.map((a, i) => (
                  <FadeIn key={a.id} delay={i * 0.05}>
                    <AnalystCard analyst={a} spark={a.spark} resolvedCalls={a.resolved} />
                  </FadeIn>
                ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1200px] px-5 py-20">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-[var(--accent)] px-8 py-16 text-center text-[var(--accent-ink)]">
          <ChartLineUp size={36} weight="duotone" className="mx-auto opacity-90" />
          <h2 className="t-h1 mx-auto mt-5 max-w-xl text-[var(--accent-ink)]">
            Find research worth paying for.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[var(--accent-ink)]/85">
            Join Stoa as an investor, or start building your public track record as an analyst.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link
              href="/sign-up"
              className="inline-flex h-12 items-center rounded-[var(--radius-btn)] bg-[var(--accent-ink)] px-6 text-sm font-medium text-[var(--accent)] transition-transform active:scale-[0.98]"
            >
              Join Stoa
            </Link>
            <Link
              href="/discover"
              className="inline-flex h-12 items-center rounded-[var(--radius-btn)] border border-[var(--accent-ink)]/30 px-6 text-sm font-medium text-[var(--accent-ink)] transition-colors hover:bg-[var(--accent-ink)]/10"
            >
              Explore first
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
