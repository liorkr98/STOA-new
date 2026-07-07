import { formatDispatchDateline } from "@/lib/dispatch/cycle";

/**
 * Front-page masthead (ref: dailydispatch.app): issue block and date block
 * flank the centered Fraunces wordmark, then an Oxford rule (heavy over
 * hairline) and a mono dateline row. The corners collapse on small screens.
 */
export function DispatchMasthead({
  issueNumber,
  dateIso,
  readMinutes,
  personalized,
  followedCount = 0,
  className,
}: {
  issueNumber: number;
  dateIso: string;
  readMinutes: number;
  personalized?: boolean;
  followedCount?: number;
  className?: string;
}) {
  const [year, month, day] = dateIso.split("-");
  const monthShort = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 17))
    .toLocaleDateString("en-US", { month: "short", timeZone: "America/New_York" })
    .toUpperCase();
  const dateline = formatDispatchDateline(dateIso);

  return (
    <header className={className}>
      {/* Corner device per the reference: day/month stacked left, year split
          in two lines right, wordmark centered between them. */}
      <div className="dispatch-masthead">
        <div className="dispatch-corner hidden text-left sm:block" aria-hidden>
          <span className="dispatch-corner-big">{day}</span>
          <span className="dispatch-corner-small">{monthShort}</span>
        </div>
        <h1 className="dispatch-wordmark" aria-label="Stoa">
          STOA
        </h1>
        <div className="dispatch-corner hidden text-right sm:block" aria-hidden>
          <span className="dispatch-corner-big">{year.slice(0, 2)}</span>
          <span className="dispatch-corner-big">{year.slice(2)}</span>
        </div>
      </div>

      <div className="dispatch-oxford" aria-hidden />

      <p className="dispatch-dateline">
        <span className="font-semibold text-text">Issue №{issueNumber}</span>
        <span className="dispatch-dateline-sep" aria-hidden>
          ·
        </span>
        <span>{dateline}</span>
        <span className="dispatch-dateline-sep" aria-hidden>
          ·
        </span>
        <span>{readMinutes} min read</span>
        {personalized && (
          <>
            <span className="dispatch-dateline-sep" aria-hidden>
              ·
            </span>
            <span className="font-semibold text-[var(--accent)]">Your dispatch</span>
            {followedCount > 0 && (
              <>
                <span className="dispatch-dateline-sep" aria-hidden>
                  ·
                </span>
                <span>
                  {followedCount} analyst{followedCount === 1 ? "" : "s"}
                </span>
              </>
            )}
          </>
        )}
      </p>
    </header>
  );
}
