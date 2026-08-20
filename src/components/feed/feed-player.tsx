"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Bookmark, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Heart, MessageSquare, Pause, Play, Share2, Volume2, VolumeX, X } from "lucide-react";
import { toggleFollow, toggleLike, toggleSave } from "@/app/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { DirectionTag } from "@/components/ui/tag";
import { TickerChip, ThemeTag } from "@/components/ui/ticker-chip";
import { SealStamp } from "@/components/ui/seal-stamp";
import { FeedCardView } from "@/components/feed/feed-cards";
import { trackEngagement } from "@/lib/engagement/track-client";
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
  canAct = false,
}: {
  publications: FeedPublication[];
  startIndex?: number;
  onClose?: () => void;
  mode?: "overlay" | "page";
  onIndexChange?: (index: number) => void;
  /** Page mode only: content rendered beneath the stage and cards (the discussion). */
  below?: (pub: FeedPublication) => React.ReactNode;
  /** Signed in: like, save and follow act; otherwise they route to sign-in. */
  canAct?: boolean;
}) {
  const [index, setIndex] = useState(Math.min(startIndex, Math.max(0, publications.length - 1)));
  const [cardIndex, setCardIndex] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastRight = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const cardTrackRef = useRef<HTMLDivElement>(null);

  const router = useRouter();
  const [, startAction] = useTransition();
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [followed, setFollowed] = useState<Record<string, boolean>>({});
  const [shared, setShared] = useState(false);

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

  // Engagement (brief item 4): one impression + play per publication reached, and
  // the swipe depth so the funnel knows how far a session got. Batched client-side.
  useEffect(() => {
    if (!pub) return;
    trackEngagement({ reportId: pub.id, kind: "impression", surface: "feed" });
    trackEngagement({ reportId: pub.id, kind: "play", surface: "feed" });
    trackEngagement({ reportId: pub.id, kind: "swipe_depth", value: index, surface: "feed" });
  }, [pub, index]);

  // Reaching the unlock card is the paywall's funnel step.
  useEffect(() => {
    if (!pub) return;
    if (unlockIndex >= 0 && cardIndex === unlockIndex) {
      trackEngagement({ reportId: pub.id, kind: "cta_reach", value: cardIndex, surface: "feed" });
    }
  }, [pub, cardIndex, unlockIndex]);

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

  const requireAuth = () => {
    if (canAct) return true;
    router.push(`/sign-in?next=${encodeURIComponent(mode === "page" ? "/discover" : "/explore")}`);
    return false;
  };
  const onLike = () => {
    if (!requireAuth()) return;
    setLiked((m) => ({ ...m, [pub.id]: !m[pub.id] }));
    startAction(async () => {
      const r = await toggleLike(pub.id).catch(() => null);
      if (r) setLiked((m) => ({ ...m, [pub.id]: r.liked }));
    });
  };
  const onSave = () => {
    if (!requireAuth()) return;
    setSaved((m) => ({ ...m, [pub.id]: !m[pub.id] }));
    startAction(async () => {
      const r = await toggleSave(pub.id).catch(() => null);
      if (r) setSaved((m) => ({ ...m, [pub.id]: r.saved }));
    });
  };
  const onFollow = () => {
    if (!requireAuth()) return;
    setFollowed((m) => ({ ...m, [pub.analyst.id]: !m[pub.analyst.id] }));
    startAction(async () => {
      const r = await toggleFollow(pub.analyst.id).catch(() => null);
      if (r) setFollowed((m) => ({ ...m, [pub.analyst.id]: r.following }));
    });
  };
  const onDiscuss = () => {
    const el = document.querySelector('section[aria-label="Discussion"]');
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else router.push(`/report/${pub.id}#discussion`);
  };
  const onShare = async () => {
    const url = `${window.location.origin}/report/${pub.id}`;
    try {
      if (navigator.share) await navigator.share({ title: pub.headline, url });
      else await navigator.clipboard.writeText(url);
      setShared(true);
      setTimeout(() => setShared(false), 1600);
    } catch {
      // dismissed
    }
  };

  const datelineParts = (withYear: boolean) =>
    [
      pub.typeLabel,
      pub.ticker ?? pub.themeTag,
      new Date(pub.publishedAt)
        .toLocaleDateString("en-US", withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" })
        .toUpperCase(),
      fmt(pub.durationSeconds),
    ]
      .filter(Boolean)
      .join(" · ");
  const dateline = datelineParts(true);
  const datelineShort = datelineParts(false);
  const isFollowing = Boolean(followed[pub.analyst.id]);

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

      {/* The dateline strip: mono, inside the frame, above the picture. */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-3 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.55),rgba(0,0,0,0.25)_70%,transparent)] px-4 pb-5 pt-3">
        <span className="num hidden truncate text-[10px] uppercase tracking-[0.18em] text-white/90 sm:inline">{dateline}</span>
        <span className="num truncate text-[10px] uppercase tracking-[0.14em] text-white/90 sm:hidden">{datelineShort}</span>
        <div className="flex flex-none items-center gap-0.5">
          <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute (M)" : "Mute (M)"} className="focus-ring rounded-full p-1.5 hover:bg-white/10">
            {muted ? <VolumeX size={15} strokeWidth={1.6} /> : <Volume2 size={15} strokeWidth={1.6} />}
          </button>
          <button type="button" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Play (Space)" : "Pause (Space)"} className="focus-ring rounded-full p-1.5 hover:bg-white/10">
            {paused ? <Play size={15} strokeWidth={1.6} /> : <Pause size={15} strokeWidth={1.6} />}
          </button>
          {onClose ? (
            <button type="button" onClick={onClose} aria-label="Close (Esc)" className="focus-ring rounded-full p-1.5 hover:bg-white/10 md:hidden">
              <ChevronLeft size={17} strokeWidth={1.6} />
            </button>
          ) : null}
        </div>
      </div>

      {/* The lower third: the identity band at the bottom of the picture. The
          face stays the hero; the band anchors it, broadcast-style. */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-[linear-gradient(to_top,rgba(0,0,0,0.72),rgba(0,0,0,0.4)_70%,transparent)] px-4 pb-4 pt-8">
        <Link href={`/analyst/${pub.analyst.handle}`} className="focus-ring flex min-w-0 flex-1 items-center gap-3 rounded">
          <Avatar src={pub.analyst.avatarUrl} name={pub.analyst.displayName} size="md" className="!border-white/30" />
          <span className="min-w-0">
            <span className="block truncate text-[0.9375rem] font-semibold leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
              {pub.analyst.displayName}
              {pub.stageMarker ? <span className="num ml-2 align-middle text-[10px] uppercase tracking-[0.16em] text-[var(--brass)]">{pub.stageMarker}</span> : null}
            </span>
            <span className="num block truncate text-[10px] uppercase tracking-[0.14em] text-white/75">@{pub.analyst.handle}</span>
          </span>
        </Link>
        <button
          type="button"
          onClick={onFollow}
          aria-pressed={isFollowing}
          className={cn(
            "num focus-ring flex-none rounded-[var(--radius-tag)] border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors",
            isFollowing ? "border-white/70 bg-white/15 text-white" : "border-white/45 text-white/90 hover:border-white hover:text-white",
          )}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  );

  /** LIKE · DISCUSS · SAVE · SHARE as small outlined icons with mono labels; the card pager at the right end. */
  const actionBar = (
    <div className="mt-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 sm:gap-3" role="group" aria-label="Actions">
        {(
          [
            { key: "like", label: "Like", Icon: Heart, on: onLike, active: Boolean(liked[pub.id]) },
            { key: "discuss", label: "Discuss", Icon: MessageSquare, on: onDiscuss, active: false },
            { key: "save", label: "Save", Icon: Bookmark, on: onSave, active: Boolean(saved[pub.id]) },
            { key: "share", label: shared ? "Copied" : "Share", Icon: Share2, on: onShare, active: shared },
          ] as const
        ).map(({ key, label, Icon, on, active }) => (
          <button
            key={key}
            type="button"
            onClick={on}
            aria-pressed={key === "like" || key === "save" ? active : undefined}
            className="focus-ring group flex items-center gap-1.5 rounded"
          >
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border transition-colors",
                active ? "border-[var(--ink)] text-text" : "border-border text-text-mute group-hover:border-border-strong group-hover:text-text",
              )}
            >
              <Icon size={13} strokeWidth={1.6} fill={active && (key === "like" || key === "save") ? "currentColor" : "none"} />
            </span>
            <span className={cn("num hidden text-[10px] uppercase tracking-[0.16em] sm:inline", active ? "text-text" : "text-text-mute group-hover:text-text")}>{label}</span>
          </button>
        ))}
      </div>
      <span className="num text-[11px] tracking-[0.1em] text-text-mute" aria-label={`Card ${cardIndex + 1} of ${cards.length}`}>
        {cards.length > 0 ? `${cardIndex + 1} / ${cards.length}` : ""}
      </span>
    </div>
  );

  const headlineBlock = (
    <div className="mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {pub.ticker ? <TickerChip ticker={pub.ticker} /> : null}
        {pub.direction ? <DirectionTag direction={pub.direction} /> : null}
        {!pub.ticker && pub.themeTag ? <ThemeTag label={pub.themeTag} /> : null}
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">{pub.contentBadge}</span>
        {pub.seal ? <SealStamp status={pub.seal.status} date={new Date(pub.seal.dateISO)} size="sm" className="ml-auto" /> : null}
      </div>
      <h2 className="mt-2 font-display text-[1.375rem] font-semibold leading-[1.15] tracking-tight md:text-[1.5rem]">{pub.headline}</h2>
      {pub.deck ? <p className="mt-1.5 line-clamp-2 text-[0.875rem] text-text-mute">{pub.deck}</p> : null}
    </div>
  );

  const cardPanel =
    cards.length > 0 ? (
      <div className="flex min-h-0 flex-1 flex-col md:h-full">
        <div className="mb-3 flex items-center justify-between">
          <span className="num text-[10px] uppercase tracking-[0.18em] text-text-mute">Evidence</span>
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
    <div className="mx-auto flex h-full w-full max-w-[1100px] flex-col gap-5 md:grid md:grid-cols-[auto_minmax(0,1fr)] md:grid-rows-[minmax(0,1fr)_auto] md:items-stretch md:gap-x-8 md:gap-y-0">
        <div className="relative md:col-start-1 md:row-start-1 md:h-full">
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
        <div className="md:col-start-1 md:row-start-2">{actionBar}</div>
      <div className="flex min-h-0 flex-col md:col-start-2 md:row-span-2 md:row-start-1 md:pl-8">
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
        {headlineBlock}
        {cardPanel}
        <p className="num mt-3 hidden text-[10px] uppercase tracking-[0.14em] text-text-faint md:block">
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
