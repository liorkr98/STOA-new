import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DirectionTag } from "@/components/ui/tag";
import type { DispatchPayload } from "@/lib/dispatch/types";

/**
 * Bridge to the signed-in product, shown as the thing itself: a folded
 * miniature of today's actual issue -- real headlines, real analysts --
 * set in the same masthead language the dispatch uses at /home.
 */
export function LandingDispatchTeaser({ dispatch }: { dispatch: DispatchPayload | null }) {
  const lead = dispatch?.lead ?? null;
  const secondary = dispatch?.secondary.slice(0, 2) ?? [];

  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div className="scrub-in">
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

          <div className="scrub-in select-none border border-border bg-paper p-6 shadow-[var(--shadow-card)] sm:p-8">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-3">
              <span className="font-display text-lg font-semibold tracking-[0.28em]">STOA</span>
              <span className="num text-[10px] tracking-[0.14em] text-text-mute">YOUR BRIEFING</span>
            </div>
            <div className="num mt-2 flex items-center gap-2 text-[10px] tracking-[0.14em] text-text-mute">
              <span>ISSUE No{dispatch?.cycle.issueNumber ?? 1}</span>
              <span aria-hidden>&middot;</span>
              <span>FROM THE ANALYSTS YOU FOLLOW</span>
            </div>

            {lead ? (
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  {lead.report.ticker && (
                    <span className="num text-xs font-semibold">{lead.report.ticker}</span>
                  )}
                  {lead.prediction && <DirectionTag direction={lead.prediction.direction} />}
                </div>
                <p className="font-display mt-2 text-xl font-semibold leading-snug text-text" style={{ textWrap: "balance" }}>
                  {lead.headline}
                </p>
                {lead.dek && (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-text-mute">{lead.dek}</p>
                )}
                <p className="t-meta mt-2">@{lead.author.handle}</p>
              </div>
            ) : (
              <div className="mt-5 space-y-1.5" aria-hidden>
                <div className="h-3.5 w-11/12 rounded-sm bg-surface-2" />
                <div className="h-3.5 w-3/4 rounded-sm bg-surface-2" />
              </div>
            )}

            {secondary.length > 0 && (
              <div className="mt-5 grid gap-5 border-t border-border pt-4 sm:grid-cols-2">
                {secondary.map((story) => (
                  <div key={story.report.id}>
                    <p className="font-display text-sm font-semibold leading-snug text-text">
                      {story.headline}
                    </p>
                    <p className="t-meta mt-1">@{story.author.handle}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
