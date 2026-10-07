import type { ReactNode } from "react";
import { TodayShell } from "@/components/today/today-shell";
import { TodayListsButton, TodaySidebar } from "@/components/today/today-sidebar";
import { TodayLead } from "@/components/today/today-lead";
import { TodayFaces } from "@/components/today/today-faces";
import { ClusterBand, DeskBand, MinuteBand, NewsBand, ReadingBand } from "@/components/today/today-sections";
import { publishedTodayLabel, todayDateLabel } from "@/lib/today/format";
import type { TodayPagePayload } from "@/lib/today/types";
import type { FeedPublication } from "@/lib/feed/types";

/**
 * Today (/home), in Direction B.
 *
 * "Today." at display size and a plain dateline; the lead; the faces of the
 * people posting; four clips worth a minute; then the reader's desk, more
 * on the lead's theme, the written pieces and the wire. Bands part by space.
 *
 * Signed out, the page is the part everyone shares: no faces and no desk,
 * the general clips with a line asking the visitor to join, and the rail's
 * "Your" lists asking them to sign in.
 *
 * The rail of lists sits beside the page on a desktop, each column
 * scrolling on its own; on a phone the page is one document scroll and the
 * rail is a drawer behind Lists, beside the dateline.
 */
export function TodayPage({
  data,
  news,
  faceFixture,
}: {
  data: TodayPagePayload;
  news?: ReactNode;
  /** Dev only: each face's recent work, so the overlay runs without a database. */
  faceFixture?: Record<string, FeedPublication[]>;
}) {
  const hasAnything = data.lead || data.minute.length || data.reading.length || data.desk.length;

  return (
    <TodayShell>
      <TodaySidebar data={data.sidebar} />

      <article className="today-column min-w-0 flex-1 max-md:overflow-x-clip">
        <header className="pt-2 md:pt-4">
          <h1 className="t-display text-text">Today.</h1>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="num min-w-0 text-body text-text-mute">
              {todayDateLabel(data.dateISO)}
              <span aria-hidden> · </span>
              {publishedTodayLabel(data.publishedToday)}
            </p>
            <div className="shrink-0 md:hidden">
              <TodayListsButton data={data.sidebar} />
            </div>
          </div>
        </header>

        {data.lead ? <TodayLead lead={data.lead} className="mt-8 md:mt-10" /> : null}

        {data.sidebar.signedIn ? (
          <TodayFaces
            people={data.faces.people}
            today={data.faces.today}
            signedIn
            fixture={faceFixture}
            className="today-band"
          />
        ) : null}
        <MinuteBand items={data.minute} signedIn={data.sidebar.signedIn} className="today-band" />
        <DeskBand items={data.desk} className="today-band" />
        <ClusterBand cluster={data.cluster} className="today-band" />
        <ReadingBand items={data.reading} className="today-band" />
        {news ?? <NewsBand items={data.news} className="today-band" />}

        {!hasAnything ? (
          <p className="t-title mt-16 text-center text-text-mute">
            Nothing has been published yet. Today fills as analysts publish.
          </p>
        ) : null}
      </article>
    </TodayShell>
  );
}
