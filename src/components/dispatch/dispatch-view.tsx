import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DispatchForCreators } from "@/components/dispatch/dispatch-for-creators";
import { DispatchHowItWorks } from "@/components/dispatch/dispatch-how-it-works";
import { DispatchLead } from "@/components/dispatch/dispatch-lead";
import { DispatchLeaderboard } from "@/components/dispatch/dispatch-leaderboard";
import { DispatchLedger } from "@/components/dispatch/dispatch-ledger";
import { DispatchMasthead } from "@/components/dispatch/dispatch-masthead";
import { DispatchStoryList } from "@/components/dispatch/dispatch-story-list";
import { DispatchWire } from "@/components/dispatch/dispatch-wire";
import type { DispatchPayload } from "@/lib/dispatch/types";

/**
 * The front page. Numbered, dated, with a top and a bottom -- the homepage
 * adopting the same trust logic as the seal. Editorial content runs from the
 * masthead to the end slug; recruitment and the explainer sit after the close.
 */
export function DispatchView({ dispatch }: { dispatch: DispatchPayload }) {
  const { personalized, cycle } = dispatch;

  return (
    <article className="dispatch-page mx-auto w-full max-w-3xl px-5 py-10 sm:py-14">
      <DispatchMasthead
        issueNumber={cycle.issueNumber}
        dateIso={cycle.date}
        readMinutes={dispatch.readMinutes}
        personalized={personalized}
        followedCount={dispatch.followedCount}
      />

      {cycle.fallbackCycle ? (
        <p className="dispatch-fallback-note text-center font-mono text-[11px] uppercase tracking-widest text-text-faint">
          Low volume · showing recent highlights
        </p>
      ) : null}

      {dispatch.lead ? (
        <DispatchLead story={dispatch.lead} />
      ) : (
        <p className="dispatch-section text-center text-sm text-text-mute">
          No lead story in this cycle yet. Check back as analysts publish.
        </p>
      )}

      {dispatch.secondary.length > 0 && <DispatchStoryList stories={dispatch.secondary} />}

      {dispatch.wire.length > 0 && <DispatchWire stories={dispatch.wire} />}

      <DispatchLedger items={dispatch.resolved} />

      {personalized && dispatch.leaderboard.length > 0 && (
        <DispatchLeaderboard entries={dispatch.leaderboard} />
      )}

      <footer className="dispatch-end">
        <p className="dispatch-end-slug">End of issue №{cycle.issueNumber}</p>
        <p className="mt-2 text-sm text-text-mute">
          Next issue tomorrow. Read it again then, or browse the archive now.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link href="/discover" className={buttonClass("secondary", "sm")}>
            Browse all research
          </Link>
          <Link href="/markets" className={buttonClass("ghost", "sm")}>
            Markets →
          </Link>
        </div>
      </footer>

      <DispatchForCreators />
      <DispatchHowItWorks />
    </article>
  );
}
