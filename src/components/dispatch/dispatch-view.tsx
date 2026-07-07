import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DispatchForCreators } from "@/components/dispatch/dispatch-for-creators";
import { DispatchHowItWorks } from "@/components/dispatch/dispatch-how-it-works";
import { DispatchLead } from "@/components/dispatch/dispatch-lead";
import { DispatchLeaderboard } from "@/components/dispatch/dispatch-leaderboard";
import { DispatchLedger } from "@/components/dispatch/dispatch-ledger";
import { DispatchMasthead } from "@/components/dispatch/dispatch-masthead";
import { DispatchStoryList } from "@/components/dispatch/dispatch-story-list";
import type { DispatchPayload, DispatchViewMode } from "@/lib/dispatch/types";

export function DispatchView({
  dispatch,
  mode,
}: {
  dispatch: DispatchPayload;
  mode: DispatchViewMode;
}) {
  const { personalized, cycle } = dispatch;
  const isHome = mode === "home";

  return (
    <article
      className={
        isHome
          ? "dispatch-page dispatch-page--home mx-auto w-full max-w-[42rem] px-5 py-12 sm:py-16"
          : "dispatch-page dispatch-page--public mx-auto w-full max-w-[42rem] px-5 py-12 sm:py-16"
      }
    >
      <DispatchMasthead
        issueNumber={cycle.issueNumber}
        dateIso={cycle.date}
        readMinutes={dispatch.readMinutes}
        personalized={personalized}
        mode={mode}
      />

      {isHome ? (
        <p className="dispatch-briefing-tagline mb-10 text-center text-sm text-text-mute leading-relaxed">
          From the analysts you follow and subscribe to — ranked by signal, not noise.
        </p>
      ) : null}

      {cycle.fallbackCycle ? (
        <p className="dispatch-fallback-note -mt-4 mb-8 text-center font-mono text-text-faint text-xs uppercase tracking-widest">
          Low volume — showing recent highlights
        </p>
      ) : null}

      {dispatch.lead ? (
        <DispatchLead story={dispatch.lead} align={isHome ? "start" : "center"} />
      ) : (
        <p className="mb-10 text-center text-sm text-text-mute">
          No lead story in this cycle yet. Check back as analysts publish.
        </p>
      )}

      {dispatch.secondary.length > 0 ? (
        <DispatchStoryList
          stories={dispatch.secondary}
          title={isHome ? "Also in your briefing" : "Also in this issue"}
        />
      ) : null}

      <DispatchLedger items={dispatch.resolved} />

      {isHome && dispatch.leaderboard.length > 0 ? (
        <DispatchLeaderboard entries={dispatch.leaderboard} />
      ) : null}

      {isHome ? (
        <div className="dispatch-section text-center">
          <Link href="/discover" className={buttonClass("ghost", "sm")}>
            Browse all research in Discover →
          </Link>
        </div>
      ) : null}

      {!isHome ? (
        <>
          <DispatchHowItWorks />
          <DispatchForCreators />
        </>
      ) : null}
    </article>
  );
}
