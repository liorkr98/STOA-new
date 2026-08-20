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
import type { TodayPagePayload } from "@/lib/today/types";
import type { ReactNode } from "react";

/**
 * Today (/home): Stoa's daily newspaper. A persistent left sidebar of grouped
 * lists beside the main column; a masthead; a split lead; then bands that
 * each scroll horizontally on their own; a quiet wire-news list last.
 */
export function TodayPage({ data, news }: { data: TodayPagePayload; news?: ReactNode }) {
  const hasAnything =
    data.lead || data.trending.length || data.desk.length || data.verdicts.length || data.theme || data.news.length;

  return (
    <div className="dispatch-page dispatch-page--home grid gap-8 md:grid-cols-[248px_minmax(0,1fr)] md:gap-10">
      <TodaySidebar data={data.sidebar} />

      <article className="min-w-0 py-2 sm:py-4">
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
    </div>
  );
}
