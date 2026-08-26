"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import { Play, BadgeCheck, ChevronDown } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { PlaceholderThumb } from "@/components/ui/placeholder-thumb";
import type { Direction } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import { TickerChip, ThemeTag } from "@/components/ui/ticker-chip";
import { DirectionTag } from "@/components/ui/tag";
import { SealStamp } from "@/components/ui/seal-stamp";
import { FollowButton } from "@/components/follow-button";
import { ShareMenu } from "@/components/share/share-menu";
import { TierPickerModal } from "@/components/profile/tier-picker-modal";

/** One publication as the storefront renders it: a video tile or a written tile. */
export interface ProfilePublication {
  id: string;
  href: string;
  /** "video" when a ready clip exists; "written" renders as a typographic tile. */
  kind: "video" | "written";
  typeLabel: "CALL" | "RESEARCH" | "NOTE";
  /** Set only when the publication carries a locked call (anchoring rule). */
  ticker: string | null;
  direction: Direction | null;
  /** Theme or sector tag for callless publications; null when nothing is stored. */
  themeTag: string | null;
  badge: string;
  title: string;
  deck: string | null;
  duration: string | null;
  thumbnailUrl: string | null;
  dateISO: string;
  dateLabel: string;
  views: number;
  seal: {
    status: "hit" | "miss" | "near";
    dateISO: string;
    entryExit: string;
    retLabel: string;
    retTone: "up" | "down" | "neutral";
  } | null;
  /** Filter key: the ticker for calls, the theme tag otherwise. */
  subject: string | null;
}

export interface ProfileSubject {
  key: string;
  count: number;
}

export interface AnalystProfileViewProps {
  handle: string;
  name: string;
  firstName: string;
  initials: string;
  avatarUrl: string | null;
  verified: boolean;
  specialty: string;
  bio: string | null;
  handleLine: string;
  isSelf: boolean;

  /**
   * The one place on the platform either number is shown: "4.3K FOLLOWERS ·
   * 214 MEMBERS". Members is the paying-subscriber count and is opt-in from
   * the Storefront, so this is followers alone unless the analyst turned it on.
   */
  audienceLine: string;

  /** Tier 1: the pinned publication, or the newest video. */
  lead: ProfilePublication | null;
  leadLabel: "LATEST" | "PINNED";
  /** Tier 2: three or four most-watched videos, empty when there are too few. */
  mostWatched: ProfilePublication[];
  /** Tier 3: the complete archive, empty when the lead is all there is. */
  everything: ProfilePublication[];
  /** Tickers and themes this analyst covers, with counts. Empty below two. */
  subjects: ProfileSubject[];

  // Interactivity
  analystId: string;
  initialFollowing: boolean;
  isAuthed: boolean;
  subscribeLabel: string;
  plans: Plan[];
  balance: number;
  /** Per-analyst storefront theming (scoped accent + font pairing vars). */
  storefrontStyle?: CSSProperties;
  texture?: boolean;
}

const toneColor = (tone: "up" | "down" | "neutral") =>
  tone === "up" ? "var(--up)" : tone === "down" ? "var(--down)" : "var(--text-mute)";

/**
 * A publication's image slot: the real thumbnail when one is stored, otherwise
 * a generated placeholder in this analyst's colour. Never a stock image, so a
 * missing thumbnail cannot pass for a real one.
 *
 * The play glyph is drawn only for a publication that actually has a clip. It
 * used to render unconditionally, which put a play button on written reports
 * and on videos whose thumbnail had not arrived -- a video affordance on
 * something with no video. `duration` is the tell: it is set only from a stored
 * clip, so it decides both.
 */
function VideoThumb({
  src,
  duration,
  analystId,
  isVideo,
  className,
  glyph = "md",
}: {
  src: string | null;
  duration: string | null;
  analystId: string | null | undefined;
  isVideo: boolean;
  className?: string;
  glyph?: "md" | "lg";
}) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <PlaceholderThumb seed={analystId} />
      )}
      {isVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)]",
              glyph === "lg" ? "h-16 w-16" : "h-10 w-10",
            )}
          >
            <Play size={glyph === "lg" ? 22 : 14} className="ml-0.5 text-[var(--ink)]" fill="currentColor" />
          </span>
        </div>
      )}
      {duration && (
        <span className="num absolute bottom-2 right-2 rounded bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--paper)]">
          {duration}
        </span>
      )}
    </div>
  );
}

/** Type label · ticker + direction, or theme tag · content badge. */
function MetaRow({ p, className }: { p: ProfilePublication; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <span className="num text-[11px] uppercase tracking-[0.16em] text-text-mute">{p.typeLabel}</span>
      {p.ticker && <TickerChip ticker={p.ticker} />}
      {p.direction && <DirectionTag direction={p.direction} />}
      {!p.ticker && p.themeTag && <ThemeTag label={p.themeTag} />}
      {p.badge !== p.typeLabel && (
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{p.badge}</span>
      )}
    </div>
  );
}

function SectionHead({ label, children }: { label: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-border pb-2.5">
      <h2 className="num text-[11px] uppercase tracking-[0.2em] text-text-mute">{label}</h2>
      {children}
    </div>
  );
}

function ViewsMeta({ p }: { p: ProfilePublication }) {
  return (
    <div className="num mt-2 text-[10px] uppercase tracking-[0.14em] text-text-faint">
      {p.dateLabel}
      {p.views > 0 ? ` · ${p.views.toLocaleString()} VIEWS` : ""}
      {p.seal ? ` · ${p.seal.entryExit}` : ""}
      {p.seal ? (
        <span style={{ color: toneColor(p.seal.retTone) }}>{` · ${p.seal.retLabel}`}</span>
      ) : null}
    </div>
  );
}

/** Tier 1: the lead publication at full content width. */
function LeadTier({ p, label, analystId }: { p: ProfilePublication; label: string; analystId: string }) {
  return (
    <section aria-label={`${label} publication`}>
      <div className="num mb-3 text-[11px] uppercase tracking-[0.2em] text-text-mute">{label}</div>
      <Link href={p.href} className="group block focus-ring">
        {/*
          No clip, no media area. This slot has been through a bordered empty
          rectangle and then a coloured placeholder, both of which were ways of
          filling space that a written report does not need: it leads with its
          headline, dek and byline, exactly as it does everywhere else. The type
          is already stated in the meta row below, so nothing is lost by
          drawing nothing.
        */}
        {p.kind === "video" ? (
          <VideoThumb
            src={p.thumbnailUrl}
            duration={p.duration}
            analystId={analystId}
            isVideo
            glyph="lg"
            className="-mx-4 aspect-video sm:mx-0 sm:rounded-[var(--radius-card)]"
          />
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
          <div>
            <MetaRow p={p} />
            <h2 className="mt-3 font-display text-3xl font-semibold leading-[1.1] tracking-tight md:text-[40px]">
              {p.title}
            </h2>
            {p.deck && (
              <p className="mt-2.5 max-w-[640px] text-[16px] leading-relaxed text-text-mute line-clamp-2">
                {p.deck}
              </p>
            )}
            <ViewsMeta p={p} />
          </div>
          {p.seal && (
            <SealStamp status={p.seal.status} date={new Date(p.seal.dateISO)} size="lg" className="md:mt-1" />
          )}
        </div>
      </Link>
    </section>
  );
}

/** Tier 2: a row of the analyst's most-watched videos. */
function MostWatchedTier({ items, analystId }: { items: ProfilePublication[]; analystId: string }) {
  return (
    <section aria-label="Most watched">
      <SectionHead label="Most watched" />
      <div className="-mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0">
        {items.map((p) => (
          <Link key={p.id} href={p.href} className="group w-[68vw] flex-none snap-start focus-ring md:w-auto">
            <VideoThumb src={p.thumbnailUrl} duration={p.duration} analystId={analystId} isVideo className="aspect-video rounded-[10px]" />
            <h3 className="mt-3 font-display text-lg font-semibold leading-snug tracking-tight line-clamp-2">
              {p.title}
            </h3>
            <ViewsMeta p={p} />
          </Link>
        ))}
      </div>
    </section>
  );
}

function VideoTile({ p, analystId }: { p: ProfilePublication; analystId: string }) {
  return (
    <Link href={p.href} className="group flex flex-col focus-ring">
      <VideoThumb src={p.thumbnailUrl} duration={p.duration} analystId={analystId} isVideo className="aspect-video rounded-[10px]" />
      <MetaRow p={p} className="mt-3" />
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 dir="auto" className="user-copy font-display text-lg font-semibold leading-snug tracking-tight line-clamp-2">{p.title}</h3>
        {p.seal && <SealStamp status={p.seal.status} date={new Date(p.seal.dateISO)} size="sm" className="flex-none" />}
      </div>
      <ViewsMeta p={p} />
    </Link>
  );
}

/**
 * A written report with no video: its headline and metadata, and no media area.
 *
 * It used to sit inside a bordered 16:9 box so it lined up with the video tiles
 * beside it. That box was an image slot with no image in it, kept only for the
 * grid's benefit, and the tidy row it bought was worth less than the honesty of
 * not drawing one. The tiles are top-aligned, so a shorter text item simply
 * ends sooner.
 */
function WrittenTile({ p }: { p: ProfilePublication }) {
  return (
    <Link href={p.href} className="group flex flex-col focus-ring">
      <MetaRow p={p} />
      <div className="mt-2 flex items-start justify-between gap-3">
        <h3 className="font-display text-xl font-semibold leading-[1.15] tracking-tight line-clamp-3 group-hover:underline">
          {p.title}
        </h3>
        {p.seal && <SealStamp status={p.seal.status} date={new Date(p.seal.dateISO)} size="sm" className="flex-none" />}
      </div>
      {p.deck && <p className="mt-2 text-[0.875rem] leading-relaxed text-text-mute line-clamp-2">{p.deck}</p>}
      <ViewsMeta p={p} />
    </Link>
  );
}

/** The quiet mono `SUBJECT: ALL ▾` control above the archive grid. */
function SubjectFilter({
  subjects,
  value,
  onChange,
}: {
  subjects: ProfileSubject[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="num flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-text-mute hover:text-text focus-ring"
      >
        Subject: {value ?? "All"}
        <ChevronDown size={12} strokeWidth={1.6} aria-hidden />
      </button>
      {open && (
        <ul
          role="listbox"
          className="menu-pop absolute right-0 z-20 mt-2 min-w-[220px] rounded-[var(--radius-btn)] border border-border bg-surface py-1"
        >
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn(
                "num flex w-full items-center justify-between px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] hover:bg-surface-2",
                value === null ? "text-text" : "text-text-mute",
              )}
            >
              All
            </button>
          </li>
          {subjects.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                role="option"
                aria-selected={value === s.key}
                onClick={() => {
                  onChange(s.key);
                  setOpen(false);
                }}
                className={cn(
                  "num flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] hover:bg-surface-2",
                  value === s.key ? "text-text" : "text-text-mute",
                )}
              >
                <span>{s.key}</span>
                <span className="text-text-faint">{s.count}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Tier 3: everything, videos and written reports as peers. */
function EverythingTier({ items, subjects, analystId }: { items: ProfilePublication[]; subjects: ProfileSubject[]; analystId: string }) {
  const [subject, setSubject] = useState<string | null>(null);
  const shown = useMemo(() => (subject ? items.filter((p) => p.subject === subject) : items), [items, subject]);
  return (
    <section aria-label="Everything">
      <SectionHead label="Everything">
        {subjects.length > 0 && <SubjectFilter subjects={subjects} value={subject} onChange={setSubject} />}
      </SectionHead>
      <div className="mt-5 grid grid-cols-2 items-start gap-x-4 gap-y-7 md:grid-cols-3 md:gap-x-6 md:gap-y-9">
        {shown.map((p) => (p.kind === "video" ? <VideoTile key={p.id} p={p} analystId={analystId} /> : <WrittenTile key={p.id} p={p} />))}
      </div>
    </section>
  );
}

export function AnalystProfileView(props: AnalystProfileViewProps) {
  const [modalOpen, setModalOpen] = useState(false);

  const followBtn = (
    <FollowButton
      analystId={props.analystId}
      initialFollowing={props.initialFollowing}
      isAuthed={props.isAuthed}
    />
  );

  return (
    <div className={cn("pb-[calc(6rem+var(--safe-bottom))] md:pb-0", props.texture && "paper-texture")} style={props.storefrontStyle}>
      {/* HERO: identity, audience, actions */}
      <div className="max-w-[720px]">
        <div className="flex items-start gap-4 sm:gap-5">
          <span className="flex h-16 w-16 flex-none items-center justify-center overflow-hidden rounded-[var(--radius-card)] bg-[var(--ink)] font-display text-2xl text-[var(--paper)] md:h-[92px] md:w-[92px]">
            {props.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.avatarUrl} alt={props.name} className="h-full w-full object-cover" />
            ) : (
              props.initials
            )}
          </span>
          <div className="min-w-0 pt-1">
            <div className="flex min-w-0 items-center gap-2.5">
              <h1 className="min-w-0 break-words font-display text-[1.75rem] font-semibold leading-tight tracking-tight md:text-[40px]">
                {props.name}
              </h1>
              {props.verified && (
                <BadgeCheck size={22} className="flex-none text-[var(--verdigris)]" aria-label="Verified" />
              )}
            </div>
            <div className="num mt-2 text-[11px] uppercase tracking-[0.16em] text-text-mute">
              {props.handleLine}
            </div>
            <div className="num mt-1.5 text-[11px] uppercase tracking-[0.16em] text-text-faint">
              {props.audienceLine}
            </div>
          </div>
        </div>

        <div className="mt-6 text-lg font-semibold tracking-tight">{props.specialty}</div>
        {props.bio && (
          <p className="mt-2.5 max-w-[520px] text-[15.5px] leading-relaxed text-text-mute">{props.bio}</p>
        )}
        {props.isSelf && (
          <div className="num mt-3.5 text-[10px] uppercase tracking-[0.14em] text-text-faint">
            This is how visitors see your profile ·{" "}
            <Link href="/studio/branding" className="text-text-mute underline">
              Edit in storefront →
            </Link>
          </div>
        )}

        {/* Desktop action row */}
        {!props.isSelf && (
          <div className="mt-7 hidden items-center gap-2.5 md:flex">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="flex-1 rounded-[var(--radius-card)] bg-[var(--accent)] px-5 py-3.5 text-[15px] font-medium text-[var(--accent-ink)] transition-opacity hover:opacity-90 focus-ring"
            >
              {props.subscribeLabel}
            </button>
            {followBtn}
            <ShareMenu
              target={{ url: `/analyst/${props.handle}`, title: `${props.name} on Stoa - verified track record` }}
              label="Share profile"
            />
          </div>
        )}
      </div>

      {/* THE WORK: three tiers of decreasing size. A new analyst gets only what exists. */}
      <div className="mt-12 flex flex-col gap-14 md:mt-16 md:gap-20">
        {props.lead && <LeadTier p={props.lead} label={props.leadLabel} analystId={props.analystId} />}
        {props.mostWatched.length > 0 && <MostWatchedTier items={props.mostWatched} analystId={props.analystId} />}
        {props.everything.length > 0 && <EverythingTier items={props.everything} subjects={props.subjects} analystId={props.analystId} />}
        {!props.lead && (
          <p className="t-meta">No publications yet.</p>
        )}
      </div>

      {/* MOBILE sticky action bar */}
      {!props.isSelf && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-border bg-bg px-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] pt-3 pb-[max(0.75rem,var(--safe-bottom))] md:hidden">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="min-w-0 flex-1 truncate rounded-[var(--radius-btn)] bg-[var(--accent)] px-3 py-3.5 text-[15px] font-medium text-[var(--accent-ink)] focus-ring"
          >
            {props.subscribeLabel}
          </button>
          {followBtn}
        </div>
      )}

      {modalOpen && (
        <TierPickerModal
          plans={props.plans}
          handle={props.handle}
          firstName={props.firstName}
          balance={props.balance}
          isAuthed={props.isAuthed}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}
