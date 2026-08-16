import { DispatchLead } from "@/components/dispatch/dispatch-lead";
import { DispatchMasthead } from "@/components/dispatch/dispatch-masthead";
import { DispatchVideoLead } from "@/components/dispatch/dispatch-video-lead";
import { TodayDesk } from "@/components/today/today-desk";
import { TodayMostWatched } from "@/components/today/today-most-watched";
import { TodaySaved } from "@/components/today/today-saved";
import { TodayStandings } from "@/components/today/today-standings";
import { TodayTickers } from "@/components/today/today-tickers";
import { TodayVerdicts } from "@/components/today/today-verdicts";
import { TodayWorthReading } from "@/components/today/today-worth-reading";
import type { DispatchPayload } from "@/lib/dispatch/types";
import type { TodayPayload } from "@/lib/today/types";
import type { VideoCardData } from "@/lib/video/card-data";

/**
 * Today (/home). The masthead and lead story are the approved Dispatch
 * components, unchanged; everything below them is a stack of full-width bands.
 * Bands are peer departments like a newspaper's sections, each showing only its
 * top few items and pointing at a fuller page.
 */
export function TodayView({
  dispatch,
  today,
  videoLead = null,
}: {
  dispatch: DispatchPayload;
  today: TodayPayload;
  videoLead?: VideoCardData | null;
}) {
  const { cycle, personalized } = dispatch;

  return (
    <article className="dispatch-page dispatch-page--home mx-auto w-full max-w-6xl px-5 py-10 sm:py-14">
      <DispatchMasthead
        issueNumber={cycle.issueNumber}
        dateIso={cycle.date}
        readMinutes={dispatch.readMinutes}
        personalized={personalized}
        followedCount={dispatch.followedCount}
        mode="home"
      />

      {cycle.fallbackCycle ? (
        <p className="dispatch-fallback-note mb-8 mt-6 text-center font-mono text-[11px] uppercase tracking-widest text-text-faint">
          Quiet cycle. Showing recent highlights from your network.
        </p>
      ) : null}

      {videoLead ? (
        <div className="mt-10">
          <DispatchVideoLead data={videoLead} />
        </div>
      ) : dispatch.lead ? (
        <div className="mt-10">
          <DispatchLead story={dispatch.lead} align="start" />
        </div>
      ) : null}

      <TodayDesk subscriptions={today.desk.subscriptions} following={today.desk.following} />
      <TodayVerdicts verdicts={today.verdicts} />
      <TodaySaved items={today.saved} />
      <TodayMostWatched videos={today.mostWatched} />
      <TodayStandings standings={today.standings} />
      <TodayWorthReading items={today.worthReading} />
      <TodayTickers />

      <footer className="today-end">
        <p className="today-end-slug">
          That&apos;s today&apos;s issue
          <span aria-hidden> · </span>
          check back tomorrow
        </p>
      </footer>
    </article>
  );
}
