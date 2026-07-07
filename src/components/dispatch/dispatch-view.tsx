import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { DispatchForCreators } from "@/components/dispatch/dispatch-for-creators";
import { DispatchHowItWorks } from "@/components/dispatch/dispatch-how-it-works";
import { DispatchLead } from "@/components/dispatch/dispatch-lead";
import { DispatchLeaderboard } from "@/components/dispatch/dispatch-leaderboard";
import { DispatchLedger } from "@/components/dispatch/dispatch-ledger";
import { DispatchMasthead } from "@/components/dispatch/dispatch-masthead";
import { DispatchStoryList } from "@/components/dispatch/dispatch-story-list";
import type { DispatchPayload } from "@/lib/dispatch/types";

export function DispatchView({ dispatch }: { dispatch: DispatchPayload }) {
  const { personalized, cycle } = dispatch;

  return (
    <article className="dispatch-page mx-auto w-full max-w-2xl px-5 py-12 sm:py-16">
      <DispatchMasthead
        issueNumber={cycle.issueNumber}
        dateIso={cycle.date}
        readMinutes={dispatch.readMinutes}
        personalized={personalized}
      />

      {cycle.fallbackCycle ? (
        <p className="dispatch-fallback-note -mt-4 mb-8 text-center font-mono text-text-faint text-xs uppercase tracking-widest">
          Low volume — showing recent highlights
        </p>
      ) : null}

      {dispatch.lead ? (
        <DispatchLead story={dispatch.lead} />
      ) : (
        <p className="mb-10 text-center text-sm text-text-mute">
          No lead story in this cycle yet. Check back as analysts publish.
        </p>
      )}

      {dispatch.secondary.length > 0 ? <DispatchStoryList stories={dispatch.secondary} /> : null}

      <DispatchLedger items={dispatch.resolved} />

      {personalized && dispatch.leaderboard.length > 0 ? (
        <DispatchLeaderboard entries={dispatch.leaderboard} />
      ) : null}

      {personalized ? (
        <div className="dispatch-section text-center">
          <Link href="/discover" className={buttonClass("ghost", "sm")}>
            Explore all analysts →
          </Link>
        </div>
      ) : null}

      <DispatchHowItWorks />
      <DispatchForCreators />
    </article>
  );
}
