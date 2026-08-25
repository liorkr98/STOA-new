import Link from "next/link";
import { Play } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DirectionTag } from "@/components/ui/tag";
import { SealStamp } from "@/components/ui/seal-stamp";
import { SheetTickerChip } from "@/components/markets/instrument-sheet";
import { Rail } from "@/components/ui/rail";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { ClipSlot } from "@/components/today/clip-slot";
import { durationLabel, sinceLabel, typeLabel } from "@/lib/today/format";
import { pct } from "@/lib/format";
import { cn } from "@/lib/design/cn";
import type { NewsItem } from "@/lib/market/types";
import type { TodayDeskItem, TodayItem, TodayThemeCluster, TodayVerdict } from "@/lib/today/types";

/* ---------- shared bits ---------- */

/**
 * A publication's video poster, and nothing at all when there is no video.
 *
 * `thumb` is set only when a ready clip exists, and no clip means no slot: no
 * placeholder, no empty frame, no coloured block. Today is the reading surface,
 * so a written report leads it as a headline, dek and byline with no image area
 * reserved, the same as a written report anywhere else. Reserving the frame
 * regardless was quietly asserting that every publication is a video.
 *
 * It owns its own link, so the rule cannot be got wrong at a call site: an
 * `if (!thumb)` at each one would leave an empty anchor behind.
 *
 * The placeholder still appears in one case, and it is a different case: a clip
 * that exists but whose poster frame Bunny has not produced yet. That is a
 * video with no still, not a publication with no video.
 */
export function Poster({
  thumb,
  href,
  analystId,
  className,
  glyph = "md",
}: {
  thumb: TodayItem["thumb"];
  href: string;
  analystId: string | null | undefined;
  className?: string;
  glyph?: "sm" | "md" | "lg";
}) {
  if (!thumb) return null;
  const dur = durationLabel(thumb.durationSeconds);
  const g = glyph === "lg" ? 64 : glyph === "md" ? 40 : 28;
  return (
    <Link href={href} className="focus-ring block rounded-[var(--radius-card)]">
      <div className={cn("relative overflow-hidden rounded-[var(--radius-card)] bg-surface-2", className)}>
        <ClipThumb src={thumb.thumbnailUrl} seed={analystId} />
        <span
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]"
          style={{ width: g, height: g }}
        >
          <Play size={Math.round(g * 0.36)} fill="currentColor" strokeWidth={0} className="ml-0.5" />
        </span>
        {dur ? (
          <span className="num absolute bottom-2 right-2 rounded bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--paper)]">
            {dur}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

/** Kicker for an item: sector when known, else the ticker, else the type. */
function kickerFor(item: TodayItem): string {
  return (item.sector ?? item.ticker ?? item.themeTag ?? typeLabel(item.type)).toUpperCase();
}

function Byline({ item, time = true, chips = true }: { item: TodayItem; time?: boolean; chips?: boolean }) {
  return (
    <div className="num flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.6875rem] uppercase tracking-[0.1em] text-text-mute">
      <Link href={`/analyst/${item.author.handle}`} className="focus-ring inline-flex items-center gap-1.5 rounded text-text">
        <Avatar src={item.author.avatarUrl} name={item.author.displayName} size="sm" className="!h-5 !w-5 !text-[10px]" />
        <span className="font-sans text-[0.8125rem] font-semibold normal-case tracking-normal">{item.author.displayName}</span>
      </Link>
      {chips && item.ticker ? <SheetTickerChip ticker={item.ticker} /> : null}
      {chips && item.direction ? <DirectionTag direction={item.direction} /> : null}
      {chips && !item.ticker && item.themeTag ? <span className="today-theme-chip">{item.themeTag}</span> : null}
      <span className="text-text-faint">{item.contentBadge.join(" · ").toUpperCase()}</span>
      {item.stageMarker ? <span className="today-stage">{item.stageMarker}</span> : null}
      {time ? <span className="text-text-faint">{sinceLabel(item.publishedAt)}</span> : null}
    </div>
  );
}

/* ---------- the lead split ---------- */

export function TodayLeadSplit({ lead, secondary }: { lead: TodayItem; secondary: TodayItem[] }) {
  return (
    <section aria-label="The lead" className="mt-10 grid gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] md:gap-12">
      <article className="min-w-0">
        <Poster
          thumb={lead.thumb}
          href={`/report/${lead.reportId}`}
          analystId={lead.author.id}
          glyph="lg"
          className="-mx-5 aspect-video rounded-none sm:mx-0 sm:rounded-[var(--radius-card)]"
        />
        <div className="today-kicker mt-5">The lead · {kickerFor(lead)}</div>
        <Link href={`/report/${lead.reportId}`} className="focus-ring block rounded">
          <h1 className="dispatch-lead-headline mt-2">{lead.headline}</h1>
        </Link>
        {lead.deck ? <p className="mt-3 max-w-[60ch] font-display text-[1.0625rem] leading-relaxed text-text-mute">{lead.deck}</p> : null}
        <div className="mt-4">
          <Byline item={lead} />
        </div>
      </article>

      <div className="flex min-w-0 flex-col divide-y divide-[var(--border)] border-t border-[var(--border)] md:border-t-0 md:pt-0">
        {secondary.map((s, i) => (
          <article key={s.reportId} className={cn("flex gap-3", i === 0 ? "py-5 md:pt-0" : "py-5")}>
            <div className="min-w-0 flex-1">
              <div className="today-kicker">{kickerFor(s)}</div>
              <Link href={`/report/${s.reportId}`} className="focus-ring block rounded">
                <h2 className="mt-1.5 font-display text-[1.375rem] font-semibold leading-[1.15] tracking-tight">{s.headline}</h2>
              </Link>
              <div className="mt-2.5">
                <Byline item={s} chips={false} />
              </div>
            </div>
            <ClipSlot thumb={s.thumb} href={`/report/${s.reportId}`} analystId={s.author.id} className="mt-5" />
          </article>
        ))}
      </div>
    </section>
  );
}

/* ---------- Trending now ---------- */

export function TrendingCard({ item, index }: { item: TodayItem; index: number }) {
  return (
    <article className="flex min-w-0 gap-3">
      <span className="num w-9 flex-none font-display text-[2rem] font-semibold leading-none text-text-faint md:text-[2.25rem]">
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <ClipSlot
          thumb={item.thumb}
          href={`/report/${item.reportId}`}
          analystId={item.author.id}
          size="wide"
          className="mb-2.5"
        />
        <div className="today-kicker">{kickerFor(item)}</div>
        <Link href={`/report/${item.reportId}`} className="focus-ring block rounded">
          <h3 className="mt-1 font-display text-[1.0625rem] font-semibold leading-[1.2] tracking-tight line-clamp-3">
            {item.headline}
          </h3>
        </Link>
        <div className="mt-2">
          <Byline item={item} chips={false} time={false} />
        </div>
      </div>
    </article>
  );
}

/* ---------- Your desk ---------- */

export function TodayDeskRail({ items }: { items: TodayDeskItem[] }) {
  if (items.length === 0) return null;
  return (
    <Rail title="Your desk" note="From your memberships and follows" trackClassName="items-start">
      {items.map((it) => (
        <article key={it.reportId} className="w-[240px] md:w-[260px]">
          <Poster thumb={it.thumb} href={`/report/${it.reportId}`} analystId={it.author.id} className="aspect-video" />
          <div className="num mt-2.5 truncate text-[0.6875rem] uppercase tracking-[0.12em] text-text-mute">
            {it.author.displayName} · {it.relationship === "member" ? "Member" : "Following"}
          </div>
          <Link href={`/report/${it.reportId}`} className="focus-ring block rounded">
            <h3 className="mt-1 font-display text-[1.0625rem] font-semibold leading-[1.2] tracking-tight line-clamp-2">
              {it.headline}
            </h3>
          </Link>
        </article>
      ))}
    </Rail>
  );
}

/* ---------- Verdicts ---------- */

export function VerdictRow({ v }: { v: TodayVerdict }) {
  const seal = v.outcome === "hit" ? "hit" : v.outcome === "near" || v.outcome === "partial" ? "near" : "miss";
  const ret = v.returnPct;
  const tone = ret == null ? "var(--text-mute)" : ret > 0 ? "var(--up)" : ret < 0 ? "var(--down)" : "var(--text-mute)";
  return (
    <article className="flex w-[300px] items-start justify-between gap-4 border-r border-[var(--border)] pr-6 last:border-r-0 md:w-[320px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <SheetTickerChip ticker={v.ticker} />
          <DirectionTag direction={v.direction} />
        </div>
        <Link href={`/report/${v.reportId}`} className="focus-ring block rounded">
          <h3 className="mt-2.5 font-display text-[1.0625rem] font-semibold leading-[1.2] tracking-tight line-clamp-3">
            {v.headline}
          </h3>
        </Link>
        <div className="num mt-2 text-[0.6875rem] uppercase tracking-[0.1em] text-text-mute">
          {v.author.displayName}
          <span aria-hidden> · </span>
          {v.entryPrice.toFixed(2)} → {v.exitPrice?.toFixed(2) ?? "—"}
          <span aria-hidden> · </span>
          <span style={{ color: tone }}>{ret == null ? "—" : pct(ret)}</span>
        </div>
      </div>
      <SealStamp status={seal} date={new Date(v.resolvedAt)} size="md" animateOnView className="flex-none" />
    </article>
  );
}

export function TodayVerdictsRail({ verdicts }: { verdicts: TodayVerdict[] }) {
  if (verdicts.length === 0) return null;
  return (
    <Rail
      id="verdicts"
      title="Verdicts"
      note="Calls the market just graded · always free"
      aside={
        <Link href="/markets" className="band-see-all focus-ring hidden sm:inline">
          The record →
        </Link>
      }
    >
      {verdicts.map((v) => (
        <VerdictRow key={`${v.reportId}-${v.ticker}`} v={v} />
      ))}
    </Rail>
  );
}

/* ---------- Theme cluster ---------- */

export function TodayThemeRail({ theme }: { theme: TodayThemeCluster }) {
  const [a, b, ...rest] = theme.items;
  if (!a) return null;
  return (
    <Rail
      title={theme.name}
      note={`${theme.publicationsThisWeek} publication${theme.publicationsThisWeek === 1 ? "" : "s"} this week`}
      trackClassName="items-start"
    >
      {[a, b].filter(Boolean).map((it) => (
        <article key={it!.reportId} className="w-[320px] md:w-[380px]">
          <Poster thumb={it!.thumb} href={`/report/${it!.reportId}`} analystId={it!.author.id} className="aspect-video" />
          <Link href={`/report/${it!.reportId}`} className="focus-ring block rounded">
            <h3 className="mt-3 font-display text-[1.25rem] font-semibold leading-[1.15] tracking-tight line-clamp-3">
              {it!.headline}
            </h3>
          </Link>
          <div className="mt-2">
            <Byline item={it!} />
          </div>
        </article>
      ))}
      {rest.map((it) => (
        <article key={it.reportId} className="w-[220px]">
          <ClipSlot
            thumb={it.thumb}
            href={`/report/${it.reportId}`}
            analystId={it.author.id}
            size="wide"
            className="mb-2.5"
          />
          <div className="today-kicker">{kickerFor(it)}</div>
          <Link href={`/report/${it.reportId}`} className="focus-ring block rounded">
            <h3 className="mt-1 font-display text-[1rem] font-semibold leading-[1.2] tracking-tight line-clamp-3">{it.headline}</h3>
          </Link>
          <div className="mt-2">
            <Byline item={it} chips={false} time={false} />
          </div>
        </article>
      ))}
    </Rail>
  );
}

/* ---------- Market news ---------- */

function newsTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return sinceLabel(new Date(t).toISOString());
}

export function TodayNews({ items, title = "Market news", note = "Wire headlines · not Stoa research" }: { items: NewsItem[]; title?: string; note?: string }) {
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
            <a href={n.url} target="_blank" rel="noopener noreferrer" className="focus-ring block rounded">
              <p className="text-[0.9375rem] leading-snug text-text">{n.headline}</p>
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
