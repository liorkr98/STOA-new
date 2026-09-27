import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/design/cn";
import { SectionHeading } from "@/components/ui/section-heading";

/**
 * A full-width department of a page: a SectionHeading (headline, optional
 * note, "See all" link) over its content. Bands are
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
      <SectionHeading
        className="band-head"
        title={title}
        note={note}
        href={seeAllHref}
        linkLabel={seeAllLabel}
      >
        {badge}
        {controls}
      </SectionHeading>

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
