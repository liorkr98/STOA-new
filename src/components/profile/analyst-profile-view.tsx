"use client";

import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { Play, Lock, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/design/cn";
import type { Direction, Prediction } from "@/lib/types";
import type { Plan } from "@/lib/db/plans";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DirectionTag } from "@/components/ui/tag";
import { SealStamp } from "@/components/ui/seal-stamp";
import { CallHistory } from "@/components/track/call-history";
import { FollowButton } from "@/components/follow-button";
import { ShareMenu } from "@/components/share/share-menu";
import { TierPickerModal } from "@/components/profile/tier-picker-modal";

type TabKey = "videos" | "verdicts" | "reports" | "calls";

export interface ProfileVideo {
  id: string;
  href: string;
  title: string;
  meta: string;
  /** Placeholder until a real video model exists. */
  duration: string;
}

export interface ProfilePinned {
  href: string;
  ticker: string | null;
  direction: Direction | null;
  badge: string;
  title: string;
  deck: string | null;
  footer: string;
  duration: string;
}

export interface ProfileVerdict {
  id: string;
  href: string;
  ticker: string;
  direction: Direction;
  title: string;
  entryExit: string;
  retLabel: string;
  retTone: "up" | "down" | "neutral";
  dateISO: string;
  dateLabel: string;
  sealStatus: "hit" | "miss" | "near";
}

export interface ProfileReportRow {
  id: string;
  href: string;
  typeLabel: string;
  ticker: string | null;
  badge: string;
  dateLabel: string;
  title: string;
  deck: string | null;
  access: string;
  accessTone: "ink" | "mute";
  locked: boolean;
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

  counts: { videos: number; verdicts: number; reports: number; calls: number };
  videos: ProfileVideo[];
  pinned: ProfilePinned | null;
  verdicts: ProfileVerdict[];
  reports: ProfileReportRow[];

  /** Call History tab: the full ledger, open and resolved, misses included. */
  predictions: Prediction[];

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

const toneColor = (tone: "up" | "down" | "neutral" | "ink" | "mute") =>
  tone === "up"
    ? "var(--up)"
    : tone === "down"
      ? "var(--down)"
      : tone === "ink"
        ? "var(--ink)"
        : "var(--text-mute)";

/** A dark-neutral video poster placeholder (no real thumbnails yet). */
function VideoThumb({ duration, className }: { duration: string; className?: string }) {
  return (
    <div className={cn("relative overflow-hidden bg-surface-2", className)}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-40"
        style={{
          background:
            "repeating-linear-gradient(118deg, color-mix(in srgb, var(--ink) 6%, transparent) 0 7px, transparent 7px 16px)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)]">
          <Play size={14} className="ml-0.5 text-[var(--ink)]" fill="currentColor" />
        </span>
      </div>
      <span className="num absolute bottom-2 right-2 rounded bg-[color-mix(in_srgb,var(--ink)_60%,transparent)] px-1.5 py-0.5 text-[10px] text-[var(--paper)]">
        {duration}
      </span>
    </div>
  );
}

export function AnalystProfileView(props: AnalystProfileViewProps) {
  const [tab, setTab] = useState<TabKey>("videos");
  const [modalOpen, setModalOpen] = useState(false);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "videos", label: `VIDEOS · ${props.counts.videos}` },
    { key: "verdicts", label: `VERDICTS · ${props.counts.verdicts}` },
    { key: "reports", label: `REPORTS · ${props.counts.reports}` },
    { key: "calls", label: `CALL HISTORY · ${props.counts.calls}` },
  ];

  const followBtn = (
    <FollowButton
      analystId={props.analystId}
      initialFollowing={props.initialFollowing}
      isAuthed={props.isAuthed}
    />
  );

  return (
    <div className={cn("pb-24 md:pb-0", props.texture && "paper-texture")} style={props.storefrontStyle}>
      {/* HERO */}
      <div className="grid gap-8 md:grid-cols-[55fr_45fr] md:gap-16">
        {/* LEFT: identity + audience + actions */}
        <div>
          <div className="flex items-start gap-5">
            <span className="flex h-20 w-20 flex-none items-center justify-center overflow-hidden rounded-full bg-[var(--ink)] font-display text-2xl text-[var(--paper)] md:h-[92px] md:w-[92px]">
              {props.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={props.avatarUrl} alt={props.name} className="h-full w-full object-cover" />
              ) : (
                props.initials
              )}
            </span>
            <div className="pt-1">
              <div className="flex items-center gap-2.5">
                <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight md:text-[40px]">
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
            <div className="mt-7 hidden items-stretch gap-2.5 md:flex">
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

        {/* RIGHT: pinned video */}
        {props.pinned && (
          <div className="flex flex-col md:h-full">
            <div className="num text-[11px] uppercase tracking-[0.18em] text-text-mute">
              Pinned by {props.firstName}
            </div>
            <Link
              href={props.pinned.href}
              className="mt-3.5 flex flex-1 flex-col overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface transition-colors hover:border-border-strong"
            >
              {/* The poster is the card's flexible part: it absorbs whatever
                  height is left once the card has matched the identity column,
                  down to a floor that keeps it a still rather than a strip. */}
              <VideoThumb
                duration={props.pinned.duration}
                className="h-52 w-full flex-none md:h-auto md:min-h-[140px] md:flex-1"
              />
              <div className="flex flex-none flex-col gap-3 p-5 md:gap-2.5 md:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {props.pinned.ticker && <TickerChip ticker={props.pinned.ticker} />}
                  {props.pinned.direction && <DirectionTag direction={props.pinned.direction} />}
                  <span className="num text-[11px] uppercase tracking-[0.12em] text-text-mute">
                    {props.pinned.badge}
                  </span>
                </div>
                <h2 className="font-display text-2xl font-semibold leading-snug tracking-tight">
                  {props.pinned.title}
                </h2>
                {props.pinned.deck && (
                  <p className="text-[15px] leading-relaxed text-text-mute">{props.pinned.deck}</p>
                )}
                <div className="num text-[11px] uppercase tracking-[0.14em] text-text-faint">
                  {props.pinned.footer}
                </div>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* TABS */}
      <div className="sticky top-14 z-20 mt-11 border-b border-border bg-bg">
        <div className="flex gap-6 overflow-x-auto md:gap-8">
          {tabs.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={cn(
                  "num relative whitespace-nowrap pb-3 text-[11px] uppercase tracking-[0.18em] transition-colors",
                  active ? "text-text" : "text-text-mute hover:text-text",
                )}
              >
                {t.label}
                {active && (
                  <span aria-hidden className="absolute inset-x-0 -bottom-px h-0.5 bg-[var(--ink)]" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TAB CONTENT */}
      <div className="mt-8">
        {tab === "videos" && (
          <div className="grid grid-cols-1 gap-x-7 gap-y-8 md:grid-cols-3">
            {props.videos.map((v) => (
              <Link key={v.id} href={v.href} className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                <VideoThumb duration={v.duration} className="h-44 w-full rounded-[10px] md:h-[104px] md:w-[72px] md:flex-none" />
                <div>
                  <h3 className="font-display text-lg font-semibold leading-snug tracking-tight">{v.title}</h3>
                  <div className="num mt-2.5 text-[10px] uppercase tracking-[0.14em] text-text-mute">{v.meta}</div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "verdicts" && (
          <div className="flex flex-col gap-3 md:gap-0">
            {props.verdicts.map((v) => (
              <Link
                key={v.id}
                href={v.href}
                className="rounded-[var(--radius-card)] border border-border bg-surface p-5 md:grid md:grid-cols-[1fr_240px_110px] md:items-center md:gap-8 md:rounded-none md:border-0 md:border-b md:bg-transparent md:p-0 md:py-6"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <TickerChip ticker={v.ticker} />
                      <DirectionTag direction={v.direction} />
                      <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
                        {v.dateLabel}
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight md:text-2xl">
                      {v.title}
                    </h3>
                  </div>
                  <div className="md:hidden">
                    <SealStamp status={v.sealStatus} date={new Date(v.dateISO)} size="md" />
                  </div>
                </div>

                <div className="num mt-4 flex items-center justify-between md:mt-0 md:block">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-text-faint md:hidden">
                    Entry → Exit
                  </span>
                  <div>
                    <div className="text-text-mute">{v.entryExit}</div>
                    <div className="mt-1 text-[17px] md:mt-2" style={{ color: toneColor(v.retTone) }}>
                      {v.retLabel}
                    </div>
                  </div>
                </div>

                <div className="hidden md:flex md:justify-end">
                  <SealStamp status={v.sealStatus} date={new Date(v.dateISO)} size="lg" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "reports" && (
          <div>
            {props.reports.map((r) => (
              <Link
                key={r.id}
                href={r.href}
                className="flex flex-col gap-3 border-b border-border py-6 md:grid md:grid-cols-[1fr_150px] md:items-center md:gap-8"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="num text-[11px] uppercase tracking-[0.16em] text-text-mute">
                      {r.typeLabel}
                    </span>
                    {r.ticker && <TickerChip ticker={r.ticker} />}
                    <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{r.badge}</span>
                    <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{r.dateLabel}</span>
                  </div>
                  <h3 className="mt-3 font-display text-xl font-semibold leading-snug tracking-tight md:text-2xl">
                    {r.title}
                  </h3>
                  {r.deck && <div className="mt-1.5 text-[15px] text-text-mute">{r.deck}</div>}
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  {r.locked && <Lock size={12} strokeWidth={1.4} className="text-text-mute" aria-hidden />}
                  <span
                    className="num rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-[0.16em]"
                    style={{
                      color: toneColor(r.accessTone),
                      borderColor: r.accessTone === "ink" ? "var(--ink)" : "var(--border)",
                    }}
                  >
                    {r.access}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {tab === "calls" && (
          <div className="flex flex-col gap-3">
            <p className="t-meta">All calls, including missed targets, stay visible permanently.</p>
            {props.predictions.length > 0 ? (
              <CallHistory predictions={props.predictions} showHeader={false} />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border">
                <p className="t-meta">No calls yet.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* MOBILE sticky action bar */}
      {!props.isSelf && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex gap-2.5 border-t border-border bg-bg px-4 pb-4 pt-3 md:hidden">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="flex-1 rounded-[var(--radius-card)] bg-[var(--accent)] px-3 py-3.5 text-[15px] font-medium text-[var(--accent-ink)] focus-ring"
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
