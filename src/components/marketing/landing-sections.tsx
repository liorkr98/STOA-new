import Link from "next/link";
import { Lock, ScanSearch, BadgeCheck } from "lucide-react";
import { FadeIn } from "@/components/motion/fade-in";
import { buttonClass } from "@/components/ui/button";

const PILLARS = [
  {
    icon: Lock,
    title: "Locked price targets",
    body: "Ticker, direction, target, and horizon seal at publish. The database rejects edits after the lock.",
  },
  {
    icon: ScanSearch,
    title: "AI fact-check on every claim",
    body: "Facts, opinions, and contradictions are classified before a report can go live.",
  },
  {
    icon: BadgeCheck,
    title: "Track Score, 0 to 100",
    body: "Hit rate, average return, and sample size in one number. No vanity rating beside it.",
  },
] as const;

const STEPS = [
  {
    n: "01",
    title: "Follow analysts you trust",
    body: "Browse locked calls and Track Scores before you spend a dollar.",
  },
  {
    n: "02",
    title: "Unlock research when it matters",
    body: "Pay per report or subscribe. Platform fee is always its own line.",
  },
  {
    n: "03",
    title: "Watch the record grow",
    body: "Every horizon grades against live prices. Hits and misses stay permanent.",
  },
] as const;

export function LandingSections() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-20 px-5 pb-24 pt-6">
      <FadeIn>
        <section aria-labelledby="landing-pillars">
          <h2
            id="landing-pillars"
            className="text-center font-display text-2xl font-semibold text-text sm:text-3xl"
          >
            Trust is the product
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed text-text-mute sm:text-base">
            Not a follow graph. A stranger trusting another stranger&apos;s paid opinion because the
            track record and the fact-check are more convincing than any relationship.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {PILLARS.map((p, i) => (
              <FadeIn key={p.title} delay={0.04 * i}>
                <div className="h-full rounded-[var(--radius-card)] border border-border bg-surface p-5">
                  <p.icon size={20} className="text-text" aria-hidden />
                  <h3 className="mt-4 font-display text-lg font-semibold text-text">{p.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-text-mute">{p.body}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </section>
      </FadeIn>

      <FadeIn>
        <section aria-labelledby="landing-steps">
          <h2
            id="landing-steps"
            className="text-center font-display text-2xl font-semibold text-text sm:text-3xl"
          >
            How it works
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n} className="flex flex-col gap-2">
                <span className="num text-xs font-semibold tracking-[0.18em] text-text-faint">
                  {step.n}
                </span>
                <h3 className="font-display text-base font-semibold text-text">{step.title}</h3>
                <p className="text-sm leading-relaxed text-text-mute">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </FadeIn>

      <FadeIn>
        <section className="rounded-[var(--radius-card)] border border-border bg-surface px-6 py-10 text-center sm:px-10">
          <h2 className="font-display text-2xl font-semibold text-text sm:text-3xl">
            Think clearly. Invest better.
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-sm text-text-mute sm:text-base">
            Create a free account to follow analysts, unlock research, and read your personalized
            daily briefing.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up" className={buttonClass("primary", "lg")}>
              Create account
            </Link>
            <Link href="/discover" className={buttonClass("ghost", "lg")}>
              Browse Discover
            </Link>
          </div>
        </section>
      </FadeIn>
    </div>
  );
}
