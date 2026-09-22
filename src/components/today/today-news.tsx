import type { NewsItem } from "@/lib/market/types";
import { sinceLabel } from "@/lib/today/format";

function newsTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return sinceLabel(new Date(t).toISOString());
}

/**
 * Wire headlines as a band, the Markets page's shape. Today draws the same
 * headlines in its own sheet anatomy (`NewsSheet` in today-sections.tsx).
 */
export function TodayNews({
  items,
  title = "Market news",
  note = "Wire headlines · not Stoa research",
}: {
  items: NewsItem[];
  title?: string;
  note?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="band">
      <div className="band-head">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="band-title">{title}</h2>
          <p className="rail-note">{note}</p>
        </div>
      </div>
      <ul className="mt-4 grid gap-x-8 md:grid-cols-2">
        {items.map((n) => (
          <li key={n.url} className="border-b border-[var(--border)] py-2.5">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring block rounded"
            >
              <p className="text-[0.9375rem] leading-snug text-text">
                {n.headline}
              </p>
              <p className="num mt-1 text-[0.625rem] uppercase tracking-[0.12em] text-text-faint">
                {n.source ?? "Yahoo Finance"}
                <span aria-hidden> · </span>
                {newsTime(n.datetime)}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
