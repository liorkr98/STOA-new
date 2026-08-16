import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/design/cn";

/**
 * A department of the issue. Bands are peers stacked down the page -- serif
 * section header, a note in the reader's own register, a hairline rule, and a
 * mono SEE ALL link. Nothing here nests inside anything else, and no band
 * shows its whole list; each is a window onto a fuller page.
 */
export function TodayBand({
  title,
  note,
  seeAllHref,
  seeAllLabel = "See all",
  badge,
  controls,
  children,
  className,
}: {
  title: string;
  note?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  badge?: ReactNode;
  controls?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("today-band", className)} aria-label={title}>
      <div className="today-band-head">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="today-band-title">{title}</h2>
          {badge}
          {note ? <p className="today-band-note">{note}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {controls}
          {seeAllHref ? (
            <Link href={seeAllHref} className="today-see-all focus-ring">
              {seeAllLabel}
              <span aria-hidden> →</span>
            </Link>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}

/** A column heading inside a band, one weight below the band header itself. */
export function TodayColumnHead({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="today-col-head">
      <h3 className="today-col-title">{title}</h3>
      {seeAllHref ? (
        <Link href={seeAllHref} className="today-see-all focus-ring">
          See all
          <span aria-hidden> →</span>
        </Link>
      ) : null}
    </div>
  );
}
