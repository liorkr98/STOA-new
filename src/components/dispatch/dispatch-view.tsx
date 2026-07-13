import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { FadeIn } from "@/components/motion/fade-in";
import { DispatchForCreators } from "@/components/dispatch/dispatch-for-creators";
import { DispatchHowItWorks } from "@/components/dispatch/dispatch-how-it-works";
import { DispatchIssueColumns } from "@/components/dispatch/dispatch-issue-columns";
import { DispatchLead } from "@/components/dispatch/dispatch-lead";
import { DispatchLeaderboard } from "@/components/dispatch/dispatch-leaderboard";
import { DispatchLedger } from "@/components/dispatch/dispatch-ledger";
import { DispatchMasthead } from "@/components/dispatch/dispatch-masthead";
import { DispatchVideoLead } from "@/components/dispatch/dispatch-video-lead";
import { VideoGrid } from "@/components/video/video-grid";
import type { DispatchPayload, DispatchStory, DispatchViewMode } from "@/lib/dispatch/types";
import type { VideoCardData } from "@/lib/video/card-data";

function splitColumns(dispatch: DispatchPayload): {
  research: DispatchStory[];
  calls: DispatchStory[];
  wire: DispatchStory[];
} {
  const research: DispatchStory[] = [];
  const calls: DispatchStory[] = [];
  const wire: DispatchStory[] = [...dispatch.wire];

  for (const s of dispatch.secondary) {
    if (s.report.type === "call") calls.push(s);
    else if (s.report.type === "short_post") wire.push(s);
    else research.push(s);
  }

  return { research, calls, wire };
}

/**
 * Editorial front page (ref: dailydispatch.app). Wider board + issue columns
 * under the lead. Marketing `/` is a separate SaaS landing; this view is
 * `/home` and `/dispatch`.
 */
export function DispatchView({
  dispatch,
  mode,
  videoFirst = false,
  videoLead = null,
  videoSecondary = [],
}: {
  dispatch: DispatchPayload;
  mode: DispatchViewMode;
  videoFirst?: boolean;
  videoLead?: VideoCardData | null;
  videoSecondary?: VideoCardData[];
}) {
  const { personalized, cycle } = dispatch;
  const isHome = mode === "home";
  const useVideoLead = videoFirst && Boolean(videoLead);
  const hasStories =
    Boolean(dispatch.lead) ||
    dispatch.secondary.length > 0 ||
    dispatch.wire.length > 0;
  const thinHome =
    isHome &&
    personalized &&
    Boolean(dispatch.lead) &&
    dispatch.secondary.length === 0 &&
    dispatch.wire.length === 0 &&
    dispatch.resolved.length === 0;

  const columns = splitColumns(dispatch);

  return (
    <article
      className={
        isHome
          ? "dispatch-page dispatch-page--home mx-auto w-full max-w-6xl px-5 py-10 sm:py-14"
          : "dispatch-page dispatch-page--public mx-auto w-full max-w-6xl px-5 py-10 sm:py-14"
      }
    >
      <DispatchMasthead
        issueNumber={cycle.issueNumber}
        dateIso={cycle.date}
        readMinutes={dispatch.readMinutes}
        personalized={personalized}
        followedCount={dispatch.followedCount}
        mode={mode}
      />

      {isHome ? (
        <FadeIn>
          <div className="dispatch-intro mt-8 grid gap-6 border-b border-border pb-10 sm:grid-cols-2">
            <div>
              <p className="font-display text-2xl font-semibold leading-snug text-text sm:text-3xl">
                Personalized research, ranked by signal.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-text-mute">
                From the analysts you follow and subscribe to. Not a social feed.
              </p>
            </div>
            <div className="flex flex-col justify-between gap-4 sm:items-end sm:text-right">
              <p className="text-sm leading-relaxed text-text-mute">
                Locked targets stay on the record. Track Scores update when horizons close. Browse
                the full catalog anytime in Discover.
              </p>
              <Link href="/discover" className={buttonClass("secondary", "sm")}>
                Open Discover
              </Link>
            </div>
          </div>
        </FadeIn>
      ) : (
        <FadeIn>
          <div className="dispatch-intro mt-8 grid gap-6 border-b border-border pb-10 sm:grid-cols-2">
            <p className="font-display text-2xl font-semibold leading-snug text-text sm:text-3xl">
              Today&apos;s locked calls and graded research.
            </p>
            <p className="text-sm leading-relaxed text-text-mute sm:pt-1">
              A numbered daily issue. Follow analysts to get a briefing that matches what you
              read.{" "}
              <Link href="/sign-up" className="underline hover:no-underline">
                Create a free account
              </Link>{" "}
              to personalize it.
            </p>
          </div>
        </FadeIn>
      )}

      {cycle.fallbackCycle ? (
        <p className="dispatch-fallback-note mb-8 mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-text-faint">
          Quiet cycle. Showing recent highlights from your network.
        </p>
      ) : null}

      {useVideoLead && videoLead ? (
        <div className="mt-10">
          <DispatchVideoLead data={videoLead} />
        </div>
      ) : dispatch.lead ? (
        <div className="mt-10">
          <DispatchLead story={dispatch.lead} align="start" />
        </div>
      ) : hasStories ? null : (
        <p className="dispatch-section text-center text-sm text-text-mute">
          No lead story in this cycle yet. Check back as analysts publish.
        </p>
      )}

      {videoFirst && videoSecondary.length > 0 ? (
        <section className="dispatch-section" aria-label="More on video">
          <div className="dispatch-kicker mb-6">
            <span>On video</span>
          </div>
          <VideoGrid videos={videoSecondary} />
        </section>
      ) : null}

      <DispatchIssueColumns
        research={columns.research}
        calls={columns.calls}
        wire={columns.wire}
      />

      <DispatchLedger items={dispatch.resolved} />

      {isHome && dispatch.leaderboard.length > 0 ? (
        <DispatchLeaderboard entries={dispatch.leaderboard} />
      ) : null}

      {thinHome ? (
        <div className="dispatch-section rounded-[var(--radius-card)] border border-border bg-surface px-5 py-6 text-center">
          <p className="text-sm text-text-mute">
            Thin briefing today. Follow more analysts to fill tomorrow&apos;s issue.
          </p>
          <div className="mt-4">
            <Link href="/discover?tab=researchers" className={buttonClass("secondary", "sm")}>
              Find analysts
            </Link>
          </div>
        </div>
      ) : null}

      {isHome ? (
        <div className="dispatch-section text-center">
          <Link href="/discover" className={buttonClass("ghost", "sm")}>
            Browse all research in Discover →
          </Link>
        </div>
      ) : (
        <footer className="dispatch-end">
          <p className="dispatch-end-slug">End of issue №{cycle.issueNumber}</p>
          <p className="mt-2 text-sm text-text-mute">
            Next issue tomorrow. Read it again then, or browse the archive now.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link href="/discover" className={buttonClass("secondary", "sm")}>
              Browse all research
            </Link>
            <Link href="/sign-up" className={buttonClass("primary", "sm")}>
              Get your briefing
            </Link>
          </div>
        </footer>
      )}

      {!isHome ? (
        <>
          <DispatchHowItWorks />
          <DispatchForCreators />
        </>
      ) : null}
    </article>
  );
}
