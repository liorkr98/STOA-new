import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import { Play } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { SealStamp } from "@/components/ui/seal-stamp";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DirectionTag } from "@/components/ui/tag";
import { MarketTape } from "@/components/markets/explore-bands";
import { formatDispatchDateline } from "@/lib/dispatch/cycle";
import { pct } from "@/lib/format";
import { cn } from "@/lib/design/cn";
import { packTiles } from "@/lib/explore/pack";
import type { LandingFace, LandingHeadline, LandingPayload } from "@/lib/landing/build-landing";

/**
 * The signed-out root. Two constraints held together: show without giving
 * away (headlines and previews only), and feel alive (the running tape, the
 * lead autoplaying muted, seals arriving as they scroll into view, a live
 * activity line, a wall of faces, and restrained scroll reveals driven by
 * the reader's own scroll position rather than a timer).
 */

const ACTIONS = (
  <div className="flex items-center justify-center gap-3">
    <Link href="/sign-up" className={buttonClass("primary", "lg")}>
      Sign up
    </Link>
    <Link href="/sign-in" className={buttonClass("secondary", "lg")}>
      Log in
    </Link>
  </div>
);

function Reveal({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("landing-reveal", className)}>{children}</div>;
}

/* ---------- Section 1: the doors ---------- */

function Doors({ data, tape }: { data: LandingPayload; tape?: ReactNode }) {
  const a = data.activity;
  const activity = [
    `${a.publicationsToday} publication${a.publicationsToday === 1 ? "" : "s"} today`,
    `${a.analystsToday} analyst${a.analystsToday === 1 ? "" : "s"}`,
    `${a.callsResolvedToday} call${a.callsResolvedToday === 1 ? "" : "s"} resolved`,
  ].join(" · ");
  return (
    <section aria-label="Stoa" className="landing-doors">
      <div className="mx-auto flex max-w-[720px] flex-col items-center px-5 pt-16 text-center md:pt-24">
        <h1 className="dispatch-wordmark landing-wordmark">STOA</h1>
        <p className="mt-5 font-display text-[1.375rem] tracking-tight text-text md:text-[1.625rem]">Think clearly. Invest better.</p>
        <p className="mt-6 max-w-[46ch] font-display text-[1.0625rem] leading-relaxed text-text-mute">
          Independent analysts publish their research on video. Every call locks at publish and is graded by the market, hits and misses alike.
        </p>
        <div className="mt-8">{ACTIONS}</div>
        <p className="num mt-6 text-[11px] uppercase tracking-[0.18em] text-text-mute">{activity.toUpperCase()}</p>
        <p className="num mt-10 text-[10px] uppercase tracking-[0.18em] text-text-faint">or scroll to see today ↓</p>
      </div>
      <div className="mt-8">
        {tape ?? <MarketTape quotes={data.tape} />}
      </div>
    </section>
  );
}

/* ---------- Section 2: Today, lite ---------- */

function HeadlineRow({ h }: { h: LandingHeadline }) {
  return (
    <article className="border-b border-border py-4">
      <div className="today-kicker">{h.kicker}</div>
      <h3 className="mt-1 font-display text-[1.25rem] font-semibold leading-[1.15] tracking-tight">{h.headline}</h3>
      <div className="mt-1.5 text-[0.8125rem] font-semibold text-text-mute">{h.analyst}</div>
    </article>
  );
}

function TodayLite({ data }: { data: LandingPayload }) {
  if (!data.lead) return null;
  const lead = data.lead;
  return (
    <section aria-label="Today, a glimpse" className="landing-today mx-auto mt-20 max-w-[1100px] px-5">
      <Reveal>
        <div className="flex items-baseline justify-between border-y border-[var(--ink)] py-2">
          <span className="font-display text-[1.125rem] font-semibold tracking-[0.2em]">STOA · TODAY</span>
          <span className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">
            Issue №{data.issue.issueNumber} · {formatDispatchDateline(data.issue.dateISO)}
          </span>
        </div>
      </Reveal>
      <div className="relative">
        <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]">
          <Reveal>
            <article>
              <div className="relative aspect-video overflow-hidden rounded-[var(--radius-card)] bg-[var(--ink)]">
                {lead.embedUrl ? (
                  <iframe
                    src={lead.embedUrl}
                    title={lead.headline}
                    allow="autoplay; encrypted-media"
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : lead.thumbnailUrl ? (
                  <Image src={lead.thumbnailUrl} alt="" fill sizes="(min-width: 768px) 60vw, 100vw" className="object-cover" />
                ) : (
                  <div
                    aria-hidden
                    className="absolute inset-0 opacity-30"
                    style={{
                      background:
                        "repeating-linear-gradient(118deg, color-mix(in srgb, var(--paper) 14%, transparent) 0 8px, transparent 8px 18px)",
                    }}
                  />
                )}
                {!lead.embedUrl ? (
                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]">
                    <Play size={20} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                  </span>
                ) : null}
              </div>
              <div className="today-kicker mt-5">The lead · {lead.kicker}</div>
              <h2 className="dispatch-lead-headline mt-2">{lead.headline}</h2>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[0.875rem] font-semibold text-text">{lead.analyst}</span>
                {lead.ticker ? <TickerChip ticker={lead.ticker} /> : null}
                {lead.direction ? <DirectionTag direction={lead.direction} /> : null}
              </div>
            </article>
          </Reveal>
          <Reveal>
            <div className="border-t border-border md:border-t-0">
              {data.headlines.map((h) => (
                <HeadlineRow key={h.reportId} h={h} />
              ))}
            </div>
          </Reveal>
        </div>
        {/* The withholding is visible: the section fades into the paper. */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(to_bottom,transparent,var(--paper))]" />
      </div>
      <p className="num mt-6 text-center text-[11px] uppercase tracking-[0.16em] text-text-mute">
        Members get the full issue, shaped around what they follow.
      </p>
    </section>
  );
}

/* ---------- Section 3: verdicts and faces ---------- */

function Verdicts({ data }: { data: LandingPayload }) {
  if (data.verdicts.length === 0) return null;
  return (
    <div>
      <h2 className="font-display text-[1.75rem] font-semibold tracking-tight">Most popular verdicts</h2>
      <p className="num mt-2 max-w-[44ch] text-[10px] uppercase leading-relaxed tracking-[0.14em] text-text-mute">
        Every call is recorded when it&apos;s published and graded by the market. Misses stay visible.
      </p>
      <div className="mt-6 flex flex-col divide-y divide-[var(--border)]">
        {data.verdicts.map((v) => {
          const seal = v.outcome === "hit" ? "hit" : v.outcome === "near" || v.outcome === "partial" ? "near" : "miss";
          const ret = v.returnPct;
          const tone = ret == null ? "var(--text-mute)" : ret > 0 ? "var(--up)" : ret < 0 ? "var(--down)" : "var(--text-mute)";
          return (
            <Reveal key={`${v.reportId}-${v.ticker}`}>
              <article className="flex items-start justify-between gap-4 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <TickerChip ticker={v.ticker} />
                    <DirectionTag direction={v.direction} />
                  </div>
                  <h3 className="mt-2 font-display text-[1.125rem] font-semibold leading-[1.2] tracking-tight">{v.headline}</h3>
                  <div className="num mt-1.5 text-[0.6875rem] uppercase tracking-[0.1em] text-text-mute">
                    {v.author.displayName}
                    <span aria-hidden> · </span>
                    {v.entryPrice.toFixed(2)} → {v.exitPrice?.toFixed(2) ?? "—"}
                    <span aria-hidden> · </span>
                    <span style={{ color: tone }}>{ret == null ? "—" : pct(ret)}</span>
                  </div>
                </div>
                <SealStamp status={seal} date={new Date(v.resolvedAt)} size="md" animateOnView className="flex-none" />
              </article>
            </Reveal>
          );
        })}
      </div>
    </div>
  );
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** The wall of faces: twenty-plus portraits at mixed sizes, gap-free, no metrics of any kind. */
export function FacesWall({ faces, cols = 4 }: { faces: LandingFace[]; cols?: number }) {
  if (faces.length === 0) return null;
  const inputs = faces.map((f, i) => ({ id: f.handle, size: i < 2 ? ("spotlight" as const) : i < 5 ? ("medium" as const) : ("standard" as const) }));
  const placed = new Map(packTiles(inputs, cols, { complete: true }).map((p) => [p.id, p]));
  const shown = faces.filter((f) => placed.has(f.handle));
  return (
    <div className="landing-faces">
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: `calc((100cqw - ${cols - 1} * 4px) / ${cols})` }}
    >
      {shown.map((f) => {
        const p = placed.get(f.handle)!;
        return (
          <Link
            key={f.handle}
            href={`/analyst/${f.handle}`}
            className="landing-face group relative overflow-hidden rounded-[var(--radius-btn)] bg-surface-2 focus-ring"
            style={{ gridColumn: `${p.col + 1} / span ${p.w}`, gridRow: `${p.row + 1} / span ${p.h}` }}
          >
            {f.avatarUrl ? (
              <Image src={f.avatarUrl} alt={f.displayName} fill sizes="200px" className="object-cover" />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-display text-[1.5rem] font-semibold text-text-mute">
                {initials(f.displayName)}
              </span>
            )}
            <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(to_top,rgba(0,0,0,0.55),transparent)]" />
            <div className="absolute inset-x-0 bottom-0 p-2 text-white">
              <div className={cn("truncate font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.6)]", p.size === "standard" ? "text-[0.75rem]" : "text-[0.9375rem]")}>{f.displayName}</div>
              {p.size !== "standard" ? <div className="truncate text-[0.6875rem] text-white/85">{f.specialty}</div> : null}
            </div>
          </Link>
        );
      })}
    </div>
    </div>
  );
}

function Split({ data }: { data: LandingPayload }) {
  if (data.verdicts.length === 0 && data.faces.length === 0) return null;
  return (
    <section aria-label="Verdicts and creators" className="mx-auto mt-24 max-w-[1100px] px-5">
      <div className="grid gap-12 md:grid-cols-2 md:divide-x md:divide-[var(--border)]">
        <div className="md:pr-12">
          <Verdicts data={data} />
        </div>
        <div className="md:pl-12">
          <Reveal>
            <h2 className="font-display text-[1.75rem] font-semibold tracking-tight">Most popular creators</h2>
            <p className="num mt-2 text-[10px] uppercase tracking-[0.14em] text-text-mute">Analysts people follow. A face, a name, a specialty.</p>
            <div className="mt-6 hidden md:block">
              <FacesWall faces={data.faces} cols={4} />
            </div>
            <div className="mt-6 md:hidden">
              <FacesWall faces={data.faces} cols={3} />
            </div>
          </Reveal>
        </div>
      </div>
      <Reveal className="mt-20 text-center">
        <p className="mx-auto max-w-[40ch] font-display text-[1.25rem] leading-snug tracking-tight text-text">
          Read the record before you trust the opinion.
        </p>
        <div className="mt-6">{ACTIONS}</div>
      </Reveal>
    </section>
  );
}

export function LandingPage({ data, tape }: { data: LandingPayload; tape?: ReactNode }) {
  return (
    <div className="pb-24">
      <Doors data={data} tape={tape} />
      <TodayLite data={data} />
      <Split data={data} />
    </div>
  );
}
