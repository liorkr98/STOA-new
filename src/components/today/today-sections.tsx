import { TodayCard } from "@/components/today/today-card";
import { sinceLabel } from "@/lib/today/format";
import { cn } from "@/lib/design/cn";
import type { NewsItem } from "@/lib/market/types";
import type { TodayDeskItem, TodayItem } from "@/lib/today/types";

/**
 * The sections under the package. Each is a title in the section size and
 * its content 24px below, and the page keeps 60px between sections. None
 * scrolls sideways on a desktop; on a phone Your Desk is the one that does.
 */

export function TrendingList({ items, className }: { items: TodayItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Trending now" className={className}>
      <h2 className="ts-title">Trending now</h2>
      <ol className="ts-stack">
        {items.slice(0, 5).map((it, i) => (
          <li key={it.reportId} className="flex items-start gap-4">
            <span className="ts-numeral w-10 shrink-0 md:w-12" aria-hidden>
              {i + 1}
            </span>
            <TodayCard item={it} image={false} className="flex-1" />
          </li>
        ))}
      </ol>
    </section>
  );
}

/**
 * Your Desk: a 2 × 2 of picture stories on a desktop. On a phone it is the
 * page's one sideways scroller, with the next card visibly peeking at the
 * right edge so the scroll is discoverable.
 */
export function DeskGrid({ items, className }: { items: TodayDeskItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label="Your desk" className={className}>
      <h2 className="ts-title">Your desk</h2>
      <div className="hidden grid-cols-2 gap-x-5 gap-y-6 md:grid">
        {items.slice(0, 4).map((it) => (
          <TodayCard key={it.reportId} item={it} />
        ))}
      </div>
      <div className="scroll-bare -mr-4 flex snap-x snap-mandatory gap-4 overflow-x-auto pr-4 md:hidden">
        {items.slice(0, 8).map((it) => (
          <TodayCard key={it.reportId} item={it} className="w-[82%] shrink-0 snap-start" />
        ))}
      </div>
    </section>
  );
}

function newsTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const s = sinceLabel(new Date(t).toISOString()).toLowerCase();
  return s.replace(/^([a-z])/, (c) => c.toUpperCase());
}

/** Market news in the same serif anatomy: two text lists, source and time as the byline. */
export function NewsSheet({ items, className }: { items: NewsItem[]; className?: string }) {
  if (items.length === 0) return null;
  const half = Math.ceil(items.length / 2);
  const columns = [items.slice(0, half), items.slice(half)];
  return (
    <section aria-label="Market news" className={className}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="ts-title">Market news</h2>
        <p className="ts-mono hidden sm:block">Wire headlines · not Stoa research</p>
      </div>
      <div className="grid grid-cols-1 gap-x-5 md:grid-cols-2">
        {columns.map((col, i) => (
          <ul key={i} className={cn("ts-stack", i === 1 && "mt-4 border-t border-dashed border-[var(--today-rule)] pt-4 md:mt-0 md:border-0 md:pt-0")}>
            {col.map((n) => (
              <li key={n.url}>
                <a href={n.url} target="_blank" rel="noopener noreferrer" className="focus-ring block rounded">
                  <h3 className="ts-headline ts-headline--dense">{n.headline}</h3>
                  <p className="ts-byline mt-3">
                    <span className="ts-name">{n.source ?? "Yahoo Finance"}</span>
                    <span aria-hidden> / </span>
                    {newsTime(n.datetime)}
                  </p>
                </a>
              </li>
            ))}
          </ul>
        ))}
      </div>
    </section>
  );
}
