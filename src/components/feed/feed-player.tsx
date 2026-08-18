"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { DirectionTag } from "@/components/ui/tag";
import { TickerChip, ThemeTag } from "@/components/ui/ticker-chip";
import { SealStamp } from "@/components/ui/seal-stamp";
import { FeedCardView } from "@/components/feed/feed-cards";
import { cn } from "@/lib/design/cn";
import type { FeedPublication } from "@/lib/feed/types";

/**
 * The Feed player: a framed video stage with the publication's overlays,
 * vertical navigation between publications and horizontal navigation through
 * the current publication's cards. Explore opens it as an overlay above the
 * wall; the Feed can render it as a page. Keyboard: up/down between
 * publications, left/right through cards, a double right jumps to the final
 * unlock card, M mutes, Space pauses, Escape closes.
 *
 * Playback controls talk to the Bunny embed through the player.js protocol
 * (postMessage); a publication with no clip renders the poster stage.
 */

function fmt(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function playerCommand(iframe: HTMLIFrameElement | null, method: string, value?: unknown) {
  iframe?.contentWindow?.postMessage(JSON.stringify({ context: "player.js", version: "0.0.11", method, value }), "*");
}

export function FeedPlayer({
  publications,
  startIndex = 0,
  onClose,
  mode = "overlay",
  onIndexChange,
  below,
}: {
  publications: FeedPublication[];
  startIndex?: number;
  onClose?: () => void;
  mode?: "overlay" | "page";
  onIndexChange?: (index: number) => void;
  /** Page mode only: content rendered beneath the stage and cards (the discussion). */
  below?: (pub: FeedPublication) => React.ReactNode;
}) {
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, publications.length - 1)));
  const [cardIndex, setCardIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastRight = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardTrackRef = useRef<HTMLDivElement>(null);

  const pub = publications[index];
  const cards = useMemo(() => pub?.cards ?? [], [pub]);
  const unlockIndex = cards.findIndex((c) => c.kind === "unlock");

  const goPub = useCallback(
    (delta: number) => {
      setIndex((i) => Math.max(0, Math.min(publications.length - 1, i + delta)));
      setCardIndex(0);
    },
    [publications.length],
  );
  const goCard = useCallback(
    (delta: number) => setCardIndex((c) => Math.max(0, Math.min(Math.max(0, cards.length - 1), c + delta))),
    [cards.length],
  );

  useEffect(() => {
    playerCommand(iframeRef.current, muted ? "mute" : "unmute");
  }, [muted, index]);
  useEffect(() => {
    playerCommand(iframeRef.current, paused ? "pause" : "play");
  }, [paused, index]);

  useEffect(() => {
    const el = cardTrackRef.current;
    if (!el) return;
    const child = el.children[cardIndex] as HTMLElement | undefined;
    if (!child) return;
    el.scrollTo({ left: child.offsetLeft - el.offsetLeft, behavior: document.hidden ? "auto" : "smooth" });
  }, [cardIndex]);

  useEffect(() => {
    rootRef.current?.focus();
  }, []);
  useEffect(() => {
    onIndexChange?.(index);
  }, [index, onIndexChange]);

  useEffect(() => {
    if (mode !== "overlay") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mode]);

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).tagName === "INPUT" || (e.target as HTMLElement).tagName === "TEXTAREA") return;
    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        goPub(-1);
        break;
      case "ArrowDown":
        e.preventDefault();
        goPub(1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        goCard(-1);
        break;
      case "ArrowRight": {
        e.preventDefault();
        const now = Date.now();
        if (now - lastRight.current < 380 && unlockIndex >= 0) {
          setCardIndex(unlockIndex);
        } else {
          goCard(1);
        }
        lastRight.current = now;
        break;
      }
      case "m":
      case "M":
        setMuted((m) => !m);
        break;
      case " ":
        e.preventDefault();
        setPaused((p) => !p);
        break;
      case "Escape":
        onClose?.();
        break;
    }
  };

  if (!pub) return null;

  const stage = (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[var(--radius-card)] bg-[var(--ink)] text-[var(--paper)] md:h-full md:w-auto">
      {pub.embedUrl ? (
        <iframe
          ref={iframeRef}
          key={pub.id}
          src={pub.embedUrl}
          title={pub.headline}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      ) : (
        <>
          {pub.thumbnailUrl ? (
            <Image src={pub.thumbnailUrl} alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover opacity-90" />
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
          <span className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--paper)_92%,transparent)] text-[var(--ink)]">
            {paused ? <Play size={22} fill="currentColor" strokeWidth={0} className="ml-0.5" /> : <Pause size={22} fill="currentColor" strokeWidth={0} />}
          </span>
        </>
      )}

      {/* Scrim so overlays stay legible on any picture. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-[linear-gradient(to_top,rgba(0,0,0,0.62),transparent)]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.45),transparent)]" />

      {/* Top row: analyst, controls */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-4">
        <Link href={`/analyst/${pub.analyst.handle}`} className="focus-ring inline-flex items-center gap-2 rounded">
          <Avatar src={pub.analyst.avatarUrl} name={pub.analyst.displayName} size="sm" />
          <span className="text-[0.8125rem] font-semibold [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{pub.analyst.displayName}</span>
          {pub.stageMarker ? <span className="num text-[9px] uppercase tracking-[0.16em] text-[var(--brass)]">{pub.stageMarker}</span> : null}
        </Link>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute (M)" : "Mute (M)"} className="focus-ring rounded-full p-2 hover:bg-white/10">
            {muted ? <VolumeX size={16} strokeWidth={1.6} /> : <Volume2 size={16} strokeWidth={1.6} />}
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play (Space)" : "Pause (Space)"} className="focus-ring rounded-full p-2 hover:bg-white/10">
            {paused ? <Play size={16} strokeWidth={1.6} /> : <Pause size={16} strokeWidth={1.6} />}
          </button>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close (Esc)" className="focus-ring rounded-full p-2 hover:bg-white/10 md:hidden">
              <ChevronLeft size={18} strokeWidth={1.6} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Bottom: metadata row, headline, deck, seal */}
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="num text-[10px] uppercase tracking-[0.16em] text-white/80">{pub.typeLabel}</span>
            {pub.ticker ? <TickerChip ticker={pub.ticker} className="!bg-white/15 !text-white !border-white/30" /> : null}
            {pub.direction ? <DirectionTag direction={pub.direction} /> : null}
            {!pub.ticker && pub.themeTag ? <ThemeTag label={pub.themeTag} className="!bg-white/15 !text-white !border-white/30" /> : null}
            <span className="num text-[10px] uppercase tracking-[0.14em] text-white/70">{pub.contentBadge}</span>
          </div>
          <h2 className="mt-2 font-display text-[1.375rem] font-semibold leading-[1.15] tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.5)] md:text-[1.625rem]">
            {pub.headline}
          </h2>
          {pub.deck ? <p className="mt-1.5 line-clamp-2 text-[0.875rem] text-white/80">{pub.deck}</p> : null}
        </div>
        <div className="flex flex-none flex-col items-end gap-2">
          {pub.seal ? <SealStamp status={pub.seal.status} date={new Date(pub.seal.dateISO)} size="md" /> : null}
          <span className="num text-[10px] text-white/80">{fmt(pub.durationSeconds)}</span>
        </div>
      </div>
    </div>
  );

  const cardPanel =
    cards.length > 0 ? (
      <div className="flex min-h-0 flex-1 flex-col md:h-full">
        <div className="mb-3 flex items-center justify-between">
          <span className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">
            Card {cardIndex + 1} of {cards.length}
          </span>
          <div className="flex items-center gap-1" role="group" aria-label="Cards">
            <button type="button" onClick={() => goCard(-1)} disabled={cardIndex === 0} aria-label="Previous card" className="rail-arrow focus-ring">
              <ChevronLeft size={16} strokeWidth={1.6} />
            </button>
            <button type="button" onClick={() => goCard(1)} disabled={cardIndex >= cards.length - 1} aria-label="Next card" className="rail-arrow focus-ring">
              <ChevronRight size={16} strokeWidth={1.6} />
            </button>
          </div>
        </div>
        <div
          ref={cardTrackRef}
          className="scroll-area flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pb-1 [scrollbar-width:none]"
        >
          {cards.map((c, i) => (
            <div key={c.id} className={cn("h-[420px] w-full flex-none snap-center md:h-full", i === cardIndex ? "" : "opacity-70")}>
              <FeedCardView card={c} onSealedTap={() => unlockIndex >= 0 && setCardIndex(unlockIndex)} />
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
          {cards.map((c, i) => (
            <span key={c.id} className={cn("h-1 w-1 rounded-full", i === cardIndex ? "bg-[var(--ink)]" : "bg-[var(--border-strong)]")} />
          ))}
        </div>
      </div>
    ) : (
      <div className="flex h-full items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border p-6 text-center">
        <p className="num text-[10px] uppercase tracking-[0.16em] text-text-faint">No evidence cards on this publication</p>
      </div>
    );

  const inner = (
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-stretch md:gap-8">
      <div className="relative md:h-full">
        {stage}
        {/* Vertical navigation */}
        <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 translate-x-full flex-col gap-2 md:flex" role="group" aria-label="Publications">
          <button type="button" onClick={() => goPub(-1)} disabled={index === 0} aria-label="Previous publication" className="rail-arrow focus-ring bg-surface">
            <ChevronUp size={16} strokeWidth={1.6} />
          </button>
          <span className="num text-center text-[10px] text-text-mute">
            {index + 1}/{publications.length}
          </span>
          <button type="button" onClick={() => goPub(1)} disabled={index >= publications.length - 1} aria-label="Next publication" className="rail-arrow focus-ring bg-surface">
            <ChevronDown size={16} strokeWidth={1.6} />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-col md:pl-8">
        <div className="mb-3 flex items-center justify-between md:hidden">
          <button type="button" onClick={() => goPub(-1)} disabled={index === 0} className="rail-arrow focus-ring" aria-label="Previous publication">
            <ChevronUp size={16} strokeWidth={1.6} />
          </button>
          <span className="num text-[10px] uppercase tracking-[0.16em] text-text-mute">
            {index + 1} of {publications.length}
          </span>
          <button type="button" onClick={() => goPub(1)} disabled={index >= publications.length - 1} className="rail-arrow focus-ring" aria-label="Next publication">
            <ChevronDown size={16} strokeWidth={1.6} />
          </button>
        </div>
        {cardPanel}
        <p className="num mt-3 hidden text-[9px] uppercase tracking-[0.14em] text-text-faint md:block">
          ↑↓ publications · ←→ cards · →→ unlock · M mute · Space pause · Esc close
        </p>
      </div>
    </div>
  );

  if (mode === "page") {
    return (
      <div ref={rootRef} tabIndex={-1} onKeyDown={onKey} className="outline-none">
        <div className="md:h-[min(720px,calc(100dvh-160px))]">{inner}</div>
        {below ? below(pub) : null}
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKey}
      role="dialog"
      aria-modal="true"
      aria-label={pub.headline}
      className="fixed inset-0 z-50 flex flex-col bg-[color-mix(in_srgb,var(--ink)_78%,transparent)] outline-none backdrop-blur-[2px]"
    >
      <div className="hidden items-center justify-end p-3 md:flex md:p-4">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close (Esc)"
          className="focus-ring hidden h-9 w-9 items-center justify-center rounded-full bg-surface text-text md:flex"
        >
          <X size={16} strokeWidth={1.6} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto md:overflow-hidden md:px-10 md:pb-6">
        <div className="mx-auto min-h-full max-w-[1100px] bg-bg p-3 md:h-[calc(100dvh-88px)] md:min-h-0 md:rounded-[var(--radius-card)] md:p-6">{inner}</div>
      </div>
    </div>
  );
}
