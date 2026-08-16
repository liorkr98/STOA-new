import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/design/cn";

/**
 * A full-width department of a page: serif section header, an optional note in
 * the reader's register, a hairline rule, and a mono SEE ALL link. Bands are
 * peers stacked down the page, never nested, and each shows only its top few
 * items while pointing at a fuller page.
 *
 * Shared by Today (/home) and Markets, which are the same newspaper applied to
 * publications and to instruments.
 */
export function Band({
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
    <section className={cn("band", className)} aria-label={title}>
      <div className="band-head">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="band-title">{title}</h2>
          {badge}
          {note ? <p className="band-note">{note}</p> : null}
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {controls}
          {seeAllHref ? (
            <Link href={seeAllHref} className="band-see-all focus-ring">
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
export function BandColumnHead({
  title,
  seeAllHref,
}: {
  title: string;
  seeAllHref?: string;
}) {
  return (
    <div className="band-col-head">
      <h3 className="band-col-title">{title}</h3>
      {seeAllHref ? (
        <Link href={seeAllHref} className="band-see-all focus-ring">
          See all
          <span aria-hidden> →</span>
        </Link>
      ) : null}
    </div>
  );
}
