import type { ReactNode } from "react";
import { TodayShell } from "@/components/today/today-shell";
import { TodayNameplate } from "@/components/today/today-nameplate";
import { TodayListsButton, TodaySidebar } from "@/components/today/today-sidebar";
import { TodayPackage } from "@/components/today/today-package";
import { DeskGrid, NewsSheet, TrendingList, VerdictLedger } from "@/components/today/today-sections";
import type { TodayPagePayload } from "@/lib/today/types";

/**
 * Today (/home): Stoa's daily broadsheet.
 *
 * The rail beside a 12-column page (20px gutters) on a desktop, 4 columns
 * (16px gutters, 16px margins) on a phone. The nameplate, then the top
 * package around the lead, then Trending now beside Your desk, the
 * Verdicts ledger and Market news, 60px apart. Nothing scrolls sideways on
 * a desktop; on a phone only Your desk does, and the page is one document
 * scroll with the nameplate and the lead on the first screen.
 */
export function TodayPage({ data, news }: { data: TodayPagePayload; news?: ReactNode }) {
  const hasAnything =
    data.lead || data.trending.length || data.desk.length || data.verdicts.length || data.news.length;

  return (
    <TodayShell>
      <TodaySidebar data={data.sidebar} />

      <article className="ts-column -mx-1 flex-1 md:mx-0">
        <TodayNameplate
          issueNumber={data.issue.issueNumber}
          dateIso={data.issue.dateISO}
          personalized={data.personalized}
          lists={<TodayListsButton data={data.sidebar} />}
        />

        {data.lead ? (
          <TodayPackage
            lead={data.lead}
            followUps={data.followUps}
            pictures={data.pictures}
            textStories={data.textStories}
            className="mt-8"
          />
        ) : null}

        {data.trending.length > 0 || data.desk.length > 0 ? (
          <div className="ts-section grid grid-cols-4 gap-x-4 gap-y-[60px] md:grid-cols-12 md:gap-x-5">
            <TrendingList items={data.trending} className="col-span-4 md:col-span-5" />
            <DeskGrid items={data.desk} className="col-span-4 md:col-span-6 md:col-start-7" />
          </div>
        ) : null}

        <VerdictLedger verdicts={data.verdicts} className="ts-section" />
        {news ?? <NewsSheet items={data.news} className="ts-section" />}

        {!hasAnything ? (
          <p className="ts-headline mt-16 text-center text-text-mute">
            Nothing has been published yet. Today fills as analysts publish.
          </p>
        ) : null}

        <footer className="ts-section ts-rule pb-10 pt-6 text-center">
          <p className="ts-mono">That&apos;s today&apos;s issue · check back tomorrow</p>
        </footer>
      </article>
    </TodayShell>
  );
}
