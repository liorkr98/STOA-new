import { DispatchMasthead } from "@/components/dispatch/dispatch-masthead";
import { TodaySidebar } from "@/components/today/today-sidebar";
import { TodayTrending } from "@/components/today/today-trending";
import {
  TodayDeskRail,
  TodayLeadSplit,
  TodayNews,
  TodayThemeRail,
  TodayVerdictsRail,
} from "@/components/today/today-front";
import { ScrollFrame } from "@/components/layout/scroll-frame";
import { SCROLL_COLUMN } from "@/lib/layout/frame";
import { cn } from "@/lib/design/cn";
import type { TodayPagePayload } from "@/lib/today/types";
import type { ReactNode } from "react";

/**
 * Today (/home): Stoa's daily newspaper. A persistent left sidebar of grouped
 * lists beside the main column; a masthead; a split lead; then bands that
 * each scroll horizontally on their own; a quiet wire-news list last.
 *
 * The page is a frame that fills the room under the nav, and the sidebar and
 * the main column scroll on their own inside it. The sidebar used to be a
 * sticky column pinned 80px down, a nav's height that was not above it (the
 * nav sits outside the scrolling column), so it sat a band lower than it
 * should have. Nothing here is pinned to anything now.
 */
export function TodayPage({ data, news }: { data: TodayPagePayload; news?: ReactNode }) {
  const hasAnything =
    data.lead || data.trending.length || data.desk.length || data.verdicts.length || data.theme || data.news.length;

  return (
    <ScrollFrame className="dispatch-page dispatch-page--home flex-col gap-4 md:flex-row md:gap-10">
      <TodaySidebar data={data.sidebar} />

      <article className={cn(SCROLL_COLUMN, "flex-1 py-2 sm:py-4")}>
        <DispatchMasthead
          issueNumber={data.issue.issueNumber}
          dateIso={data.issue.dateISO}
          readMinutes={0}
          personalized={data.personalized}
          mode="home"
        />

        {data.lead ? <TodayLeadSplit lead={data.lead} secondary={data.secondary} /> : null}

        <TodayTrending items={data.trending} />
        <TodayDeskRail items={data.desk} />
        <TodayVerdictsRail verdicts={data.verdicts} />
        {data.theme ? <TodayThemeRail theme={data.theme} /> : null}
        {news ?? <TodayNews items={data.news} />}

        {!hasAnything ? (
          <p className="mt-16 text-center font-display text-lg text-text-mute">
            Nothing has been published yet. Today fills as analysts publish.
          </p>
        ) : null}

        <footer className="today-end">
          <p className="today-end-slug">
            That&apos;s today&apos;s issue
            <span aria-hidden> · </span>
            check back tomorrow
          </p>
        </footer>
      </article>
    </ScrollFrame>
  );
}
