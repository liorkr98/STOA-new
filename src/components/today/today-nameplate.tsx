import type { ReactNode } from "react";
import { formatDispatchDateline } from "@/lib/dispatch/cycle";

/**
 * The nameplate: the letterspaced serif word, one ink rule, one mono line.
 * Under 110px on a desktop and under 80px on a phone, where the dateline
 * row also carries the Lists control that opens the rail.
 */
export function TodayNameplate({
  issueNumber,
  dateIso,
  personalized,
  lists,
}: {
  issueNumber: number;
  dateIso: string;
  personalized: boolean;
  /** The phone's way into the rail; rendered at the right of the dateline. */
  lists?: ReactNode;
}) {
  return (
    <header className="ts-nameplate">
      <h1 className="ts-nameplate-word" aria-label="Stoa">
        STOA
      </h1>
      <div className="ts-nameplate-rule mt-1.5 md:mt-2" aria-hidden />
      <div className="mt-1.5 flex items-center justify-between gap-3 md:mt-2">
        <p className="ts-dateline min-w-0">
          Issue №{issueNumber}
          <span aria-hidden> · </span>
          {formatDispatchDateline(dateIso)}
          <span aria-hidden> · </span>
          {personalized ? "Your daily briefing" : "Today's issue"}
        </p>
        {lists ? <div className="shrink-0 md:hidden">{lists}</div> : null}
      </div>
    </header>
  );
}
