import type { ReactNode } from "react";
import { SectionHeading } from "@/components/ui/section-heading";
import { StoryRow, StoryTile } from "@/components/today/today-bits";
import { sinceLabel } from "@/lib/today/format";
import { labelCase } from "@/lib/design/label";
import { cn } from "@/lib/design/cn";
import type { NewsItem } from "@/lib/market/types";
import type { TodayDeskItem, TodayItem } from "@/lib/today/types";

/**
 * The bands under the lead. Each is a heading and its content, and the page
 * parts them by space alone. A band with nothing in it is not drawn.
 */

function Band({
  title,
  note,
  className,
  children,
}: {
  title: string;
  note?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className={className}>
      <SectionHeading title={title} note={note} />
      <div className="mt-5">{children}</div>
    </section>
  );
}

/** Four picture stories across; two across on a phone. */
export function MinuteBand({ items, className }: { items: TodayItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Band title="Worth your next minute" className={className}>
      <div className="grid grid-cols-2 gap-x-3.5 gap-y-8 lg:grid-cols-4 lg:gap-x-5">
        {items.map((it) => (
          <StoryTile key={it.reportId} item={it} />
        ))}
      </div>
    </Band>
  );
}

function Rows({ items, className }: { items: TodayItem[]; className?: string }) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-10 gap-y-7 lg:grid-cols-2", className)}>
      {items.map((it) => (
        <StoryRow key={it.reportId} item={it} />
      ))}
    </div>
  );
}

/** The reader's own people: memberships and follows, newest first. */
export function DeskBand({ items, className }: { items: TodayDeskItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Band title="Your desk" note="From the analysts you follow and support" className={className}>
      <Rows items={items} />
    </Band>
  );
}

/** More on whatever the lead is about. */
export function ClusterBand({
  cluster,
  className,
}: {
  cluster: { label: string; items: TodayItem[] } | null;
  className?: string;
}) {
  if (!cluster || cluster.items.length === 0) return null;
  return (
    <Band title={`More on ${labelCase(cluster.label)}`} className={className}>
      <Rows items={cluster.items} />
    </Band>
  );
}

/** The written pieces: the thesis that is not the lead still gets a place. */
export function ReadingBand({ items, className }: { items: TodayItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Band title="Worth reading" className={className}>
      <Rows items={items} />
    </Band>
  );
}

/** Wire headlines: plain text, source and time beneath, two columns on a desktop. */
export function NewsBand({ items, className }: { items: NewsItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <Band title="Market news" note="Wire headlines, not Stoa research" className={className}>
      <ul className="grid grid-cols-1 gap-x-10 gap-y-5 lg:grid-cols-2">
        {items.map((n) => (
          <li key={n.url} className="min-w-0">
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="focus-ring group block rounded-inner">
              <p className="user-copy text-body font-medium text-text group-hover:underline">{n.headline}</p>
              <p className="num mt-1 text-ticker text-text-mute">
                {n.source ?? "Yahoo Finance"}
                <span aria-hidden> · </span>
                {sinceLabel(n.datetime)}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </Band>
  );
}
