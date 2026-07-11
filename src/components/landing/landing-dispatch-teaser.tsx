import Link from "next/link";
import { buttonClass } from "@/components/ui/button";

/**
 * Bridge to the signed-in product: the dispatch is the morning briefing built
 * from the analysts you follow and subscribe to. Set like a folded newspaper
 * masthead -- the same visual language the real dispatch uses at /home.
 */
export function LandingDispatchTeaser() {
  return (
    <section className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <p className="t-eyebrow text-text-mute">Once you are in</p>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-text sm:text-3xl" style={{ textWrap: "balance" }}>
              Your dispatch, every morning
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-text-mute">
              Sign in and the front page becomes yours: the day&apos;s best work from the
              analysts you follow and subscribe to, ranked by conviction and track record.
              Signal, not noise.
            </p>
            <Link href="/sign-up" className={`${buttonClass("secondary", "md")} mt-6`}>
              Build your briefing
            </Link>
          </div>

          <div className="scrub-in select-none border border-border bg-paper p-6 sm:p-8" aria-hidden>
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
              <span className="font-display text-lg font-semibold tracking-[0.28em]">STOA</span>
              <span className="num text-[10px] tracking-[0.14em] text-text-faint">
                YOUR BRIEFING
              </span>
            </div>
            <div className="num mt-2 flex items-center gap-2 text-[10px] tracking-[0.14em] text-text-faint">
              <span>ISSUE No142</span>
              <span>&middot;</span>
              <span>8 ANALYSTS YOU FOLLOW</span>
            </div>
            <div className="mt-5 space-y-1.5">
              <div className="h-3.5 w-11/12 rounded-sm bg-surface-2" />
              <div className="h-3.5 w-3/4 rounded-sm bg-surface-2" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-sm bg-surface-2" />
                <div className="h-2 w-5/6 rounded-sm bg-surface-2" />
                <div className="h-2 w-4/6 rounded-sm bg-surface-2" />
              </div>
              <div className="space-y-1.5">
                <div className="h-2 w-full rounded-sm bg-surface-2" />
                <div className="h-2 w-5/6 rounded-sm bg-surface-2" />
                <div className="h-2 w-3/6 rounded-sm bg-surface-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
