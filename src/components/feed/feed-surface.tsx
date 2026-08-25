"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  Play,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toggleFollow, toggleLike, toggleSave } from "@/app/actions/social";
import { Avatar } from "@/components/ui/avatar";
import { DirectionTag } from "@/components/ui/tag";
import { TickerChip, ThemeTag } from "@/components/ui/ticker-chip";
import { SealStamp } from "@/components/ui/seal-stamp";
import { FeedCardView } from "@/components/feed/feed-cards";
import { FeedDiscussion } from "@/components/feed/feed-discussion";
import { trackEngagement } from "@/lib/engagement/track-client";
import { trackVideoEvent } from "@/lib/video/track-client";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { NativeClip } from "@/components/video/native-clip";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { isDirectVideoUrl } from "@/lib/video/direct";
import type { FeedComment, FeedPublication } from "@/lib/feed/types";

/**
 * The Feed: the only video discovery surface, and the whole viewport.
 *
 * One publication at a time, snapped. Scrolling moves to the next publication;
 * moving sideways moves through that publication's evidence cards. The clip and
 * the cards share a single 9:16 stage, so the horizontal track is literally the
 * publication: the analyst's face first, the evidence behind it, the unlock at
 * the end.
 *
 * Vertical movement is native scroll-snap rather than a transform, so a phone's
 * own momentum and a trackpad's inertia both behave the way the reader expects,
 * and the browser handles the physics.
 *
 * Only the publication in view mounts an iframe. That is the autoplay rule and
 * the performance rule at once: a clip starts because it came into view and
 * stops because it left, and a hundred-publication feed never holds a hundred
 * players.
 */

/**
 * The viewport minus the sticky TopNav (`h-14`). The scroller and every snap
 * section have to agree on this exactly: any disagreement and each snap lands
 * a little further off than the last.
 */
const ITEM_H = "feed-snap";

function fmt(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Bunny's embed speaks player.js over postMessage. */
function playerCommand(iframe: HTMLIFrameElement | null, method: string, value?: unknown) {
  iframe?.contentWindow?.postMessage(
    JSON.stringify({ context: "player.js", version: "0.0.11", method, value }),
    "*",
  );
}

export function FeedSurface({
  publications,
  startIndex = 0,
  canAct = false,
  onPost,
  sessionId,
}: {
  publications: FeedPublication[];
  startIndex?: number;
  /** Signed in: like, save and follow act; otherwise they route to sign-in. */
  canAct?: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
  sessionId?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(Math.min(startIndex, Math.max(0, publications.length - 1)));
  const [muted, setMuted] = useState(true);
  const [discussing, setDiscussing] = useState<string | null>(null);

  // Which publication is on screen. `rootMargin` collapses the observation box
  // to a band across the middle, so exactly one section is ever the active one
  // however tall the viewport is.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = itemRefs.current.indexOf(e.target as HTMLElement);
          if (i >= 0) setActive(i);
        }
      },
      { root, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    for (const el of itemRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [publications.length]);

  // Land on the requested publication without animating past everything above
  // it, which is what Explore's tiles need when they open the Feed part-way in.
  useEffect(() => {
    if (!startIndex) return;
    itemRefs.current[startIndex]?.scrollIntoView({ block: "start", behavior: "auto" });
  }, [startIndex]);

  const goTo = useCallback((i: number) => {
    const target = itemRefs.current[i];
    if (target) target.scrollIntoView({ block: "start", behavior: "smooth" });
  }, []);

  return (
    <div
      ref={scrollerRef}
      className={cn("scroll-area scroll-bare snap-y snap-mandatory overflow-y-auto overscroll-contain bg-bg", ITEM_H)}
    >
      {publications.map((pub, i) => (
        <FeedItem
          key={pub.id}
          ref={(el) => {
            itemRefs.current[i] = el;
          }}
          pub={pub}
          index={i}
          total={publications.length}
          isActive={i === active}
          muted={muted}
          onMutedChange={setMuted}
          canAct={canAct}
          onPrev={() => goTo(i - 1)}
          onNext={() => goTo(i + 1)}
          onDiscuss={() => setDiscussing(pub.id)}
          sessionId={sessionId}
        />
      ))}

      <EndOfFeed />

      {discussing ? (
        <DiscussionPanel
          pub={publications.find((p) => p.id === discussing)!}
          canPost={canAct}
          onPost={onPost}
          onClose={() => setDiscussing(null)}
        />
      ) : null}
    </div>
  );
}

/**
 * One publication, one viewport. The stage is 9:16 and height-bound, so the
 * frame is the same shape on a phone and on a 1440 desktop and the layout never
 * depends on the window's aspect ratio.
 */
const FeedItem = function FeedItem({
  ref,
  pub,
  index,
  total,
  isActive,
  muted,
  onMutedChange,
  canAct,
  onPrev,
  onNext,
  onDiscuss,
  sessionId,
}: {
  ref: (el: HTMLElement | null) => void;
  pub: FeedPublication;
  index: number;
  total: number;
  isActive: boolean;
  muted: boolean;
  onMutedChange: (m: boolean) => void;
  canAct: boolean;
  onPrev: () => void;
  onNext: () => void;
  onDiscuss: () => void;
  sessionId?: string;
}) {
  const router = useRouter();
  const [, startAction] = useTransition();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const lastRight = useRef(0);
  const [card, setCard] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [shared, setShared] = useState(false);
  const lastRatioRef = useRef(0);
  const loopedRef = useRef(false);
  const trackedPlayRef = useRef(false);
  const clickTrackedRef = useRef(false);

  /**
   * Hand the stage from the poster to the player a beat after the publication
   * becomes active.
   *
   * Timed from mount rather than from the iframe's `load`, because a cached
   * embed can finish loading before React attaches the handler and the event is
   * then never seen. Timed rather than driven by a `play` event, because this
   * player does not reliably send one. The poster and the clip's first frame
   * are the same picture, so being a fraction early costs nothing, whereas a
   * poster that never lifts hides a clip that is actually running.
   */
  useEffect(() => {
    if (!isActive) return;
    const t = setTimeout(() => setStarted(true), 1200);
    return () => clearTimeout(t);
  }, [isActive]);

  const cards = useMemo(() => pub.cards ?? [], [pub]);
  const unlockIndex = cards.findIndex((c) => c.kind === "unlock");
  // The clip is the first panel of the track; the evidence follows it.
  const panelCount = cards.length + 1;

  // Coming back to a publication should find the analyst's face, not wherever
  // the reader stopped reading. Adjusted during render rather than in an
  // effect: resetting from an effect schedules a second render pass over the
  // whole item every time one scrolls out of view, and this is the case React
  // supports adjusting for directly.
  const [wasActive, setWasActive] = useState(isActive);
  if (wasActive !== isActive) {
    setWasActive(isActive);
    if (!isActive) {
      setCard(0);
      setPaused(false);
      setProgress(0);
      setStarted(false);
    }
  }

  useEffect(() => {
    if (!isActive) return;
    trackEngagement({ reportId: pub.id, kind: "impression", surface: "feed" });
    trackEngagement({ reportId: pub.id, kind: "play", surface: "feed" });
    trackEngagement({ reportId: pub.id, kind: "swipe_depth", value: index, surface: "feed" });
  }, [isActive, pub.id, index]);

  useEffect(() => {
    if (!pub.clipId) return;
    if (isActive) {
      if (!trackedPlayRef.current) {
        trackedPlayRef.current = true;
        loopedRef.current = false;
        lastRatioRef.current = 0;
        trackVideoEvent(pub.clipId, {
          watchedSeconds: 0,
          sessionId,
          videoLengthSeconds: pub.durationSeconds,
          surface: "feed",
          positionInFeed: index,
        });
      }
      return;
    }
    const ratio = lastRatioRef.current;
    if (trackedPlayRef.current && ratio > 0.02) {
      const watched = Math.round(ratio * pub.durationSeconds);
      trackVideoEvent(pub.clipId, {
        watchedSeconds: watched,
        completed: ratio >= 0.8,
        skippedAtSeconds: ratio < 0.2 ? watched : undefined,
        replayed: loopedRef.current,
        sessionId,
        videoLengthSeconds: pub.durationSeconds,
        surface: "feed",
        positionInFeed: index,
      });
    }
    trackedPlayRef.current = false;
    clickTrackedRef.current = false;
  }, [isActive, pub.clipId, pub.durationSeconds, index, sessionId]);

  useEffect(() => {
    if (isActive && unlockIndex >= 0 && card === unlockIndex + 1) {
      trackEngagement({ reportId: pub.id, kind: "cta_reach", value: card, surface: "feed" });
      if (pub.clipId && !clickTrackedRef.current) {
        clickTrackedRef.current = true;
        trackVideoEvent(pub.clipId, {
          clickedThroughToReport: true,
          sessionId,
          videoLengthSeconds: pub.durationSeconds,
          surface: "feed",
          positionInFeed: index,
        });
      }
    }
  }, [isActive, card, unlockIndex, pub.id, pub.clipId, pub.durationSeconds, index, sessionId]);

  useEffect(() => {
    if (isActive) playerCommand(iframeRef.current, muted ? "mute" : "unmute");
  }, [muted, isActive]);
  useEffect(() => {
    if (isActive) playerCommand(iframeRef.current, paused ? "pause" : "play");
  }, [paused, isActive]);

  /**
   * Talk to the Bunny embed, and know when it is actually showing something.
   *
   * player.js is a request/response protocol with no signal for when the far
   * side starts listening: a subscription sent too early is dropped silently,
   * and a subscription is the only thing that makes this player emit anything
   * at all. So the handshake is repeated until it is answered and then stops.
   *
   * Nothing visible depends on it succeeding. Bunny answers a subscription
   * from the console and, from here, often does not answer at all, so the
   * poster and the progress bar are driven by the iframe's own load event
   * below and these events only correct them. Commands out (mute, play, pause)
   * are one-way and do work, which is why they stay on this path.
   */
  useEffect(() => {
    if (!isActive) return;
    let answered = false;

    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      let msg: { context?: string; event?: string; value?: { seconds?: number; duration?: number } };
      try {
        msg = JSON.parse(String(e.data));
      } catch {
        return;
      }
      if (msg.context !== "player.js") return;
      answered = true;

      if (msg.event === "ready") {
        playerCommand(iframeRef.current, muted ? "mute" : "unmute");
        playerCommand(iframeRef.current, "play");
      }
      // Any of these means the player is live and the poster has done its job.
      if (msg.event === "ready" || msg.event === "play") setStarted(true);
      if (msg.event === "timeupdate" && msg.value) {
        const { seconds = 0, duration = 0 } = msg.value;
        setStarted(true);
        if (duration > 0) {
          const ratio = Math.min(1, seconds / duration);
          if (lastRatioRef.current > 0.85 && ratio < 0.15) loopedRef.current = true;
          lastRatioRef.current = ratio;
          setProgress(ratio);
        }
      }
    };

    const subscribe = () => {
      for (const ev of ["ready", "play", "timeupdate"]) {
        playerCommand(iframeRef.current, "addEventListener", ev);
      }
    };

    window.addEventListener("message", onMessage);
    subscribe();
    const retry = setInterval(() => {
      if (answered) clearInterval(retry);
      else subscribe();
    }, 500);
    // The player is either listening within a few seconds or it never will be.
    const giveUp = setTimeout(() => clearInterval(retry), 8000);

    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(retry);
      clearTimeout(giveUp);
    };
  }, [isActive, muted]);

  /**
   * The bar advances on a local clock and every `timeupdate` snaps it back to
   * the player's own position.
   *
   * Bunny's embed announces `ready` and `play` reliably but then emits
   * `timeupdate` only sparsely, so a bar driven purely by events sticks at a
   * couple of percent and looks broken. Running the clock here and correcting
   * it from the player keeps it honest and keeps it moving; it stops on pause,
   * which is the thing a timer alone would get wrong.
   */
  useEffect(() => {
    if (!isActive || !started || paused) return;
    const duration = pub.durationSeconds || 0;
    if (duration <= 0) return;
    const id = setInterval(
      () =>
        setProgress((p) => {
          const next = Math.min(1, p + 0.25 / duration);
          lastRatioRef.current = next;
          return next;
        }),
      250,
    );
    return () => clearInterval(id);
  }, [isActive, started, paused, pub.durationSeconds]);

  useEffect(() => {
    const el = trackRef.current;
    const child = el?.children[card] as HTMLElement | undefined;
    if (!el || !child) return;
    const left = child.offsetLeft - el.offsetLeft;
    // The reader's own swipe is what set `card` here, and the track is already
    // where it asked for. Scrolling again would fight the gesture that has just
    // finished settling.
    if (Math.abs(el.scrollLeft - left) <= 1) return;
    // A smooth scroll never completes in a hidden document, which leaves the
    // track stranded between two cards while the pager says it moved.
    el.scrollTo({ left, behavior: document.hidden ? "auto" : "smooth" });
  }, [card]);

  /**
   * A track the reader panned by hand has to write back to `card`.
   *
   * The pager, the chevrons and the unlock tracking all read it, so a swipe
   * that moved the track without moving the state would leave the frame saying
   * one thing and the controls another.
   *
   * Read once the scrolling settles rather than on every event: mid-gesture the
   * nearest panel flips back and forth across each boundary, and every flip
   * would re-render the publication. `scrollend` says exactly this and is used
   * where it exists; the timer is the fallback where it does not.
   */
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    let timer: ReturnType<typeof setTimeout>;

    const settled = () => {
      const width = el.clientWidth;
      if (width <= 0) return;
      const i = Math.max(0, Math.min(panelCount - 1, Math.round(el.scrollLeft / width)));
      setCard((c) => (c === i ? c : i));
    };
    // Checked on `window` rather than on the element: `in` on `el` narrows it
    // away and the cleanup can no longer see it as an element at all.
    const hasScrollEnd = "onscrollend" in window;
    const onScroll = () => {
      if (hasScrollEnd) return;
      clearTimeout(timer);
      timer = setTimeout(settled, 120);
    };

    if (hasScrollEnd) el.addEventListener("scrollend", settled);
    else el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      el.removeEventListener("scrollend", settled);
      el.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [panelCount]);

  const goCard = useCallback(
    (d: number) => setCard((c) => Math.max(0, Math.min(panelCount - 1, c + d))),
    [panelCount],
  );

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          onNext();
          break;
        case "ArrowUp":
          e.preventDefault();
          onPrev();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goCard(-1);
          break;
        case "ArrowRight": {
          e.preventDefault();
          const now = Date.now();
          // A second right within the window skips the evidence and lands on
          // the unlock card, which is the one panel a reader may be after.
          if (now - lastRight.current < 380 && unlockIndex >= 0) setCard(unlockIndex + 1);
          else goCard(1);
          lastRight.current = now;
          break;
        }
        case "m":
        case "M":
          onMutedChange(!muted);
          break;
        case " ":
          e.preventDefault();
          setPaused((p) => !p);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, goCard, onNext, onPrev, muted, onMutedChange, unlockIndex]);

  const requireAuth = () => {
    if (canAct) return true;
    router.push(`/sign-in?next=${encodeURIComponent("/feed")}`);
    return false;
  };
  const act = (
    set: (v: boolean) => void,
    current: boolean,
    fn: () => Promise<{ liked?: boolean; saved?: boolean; following?: boolean } | null>,
    read: (r: { liked?: boolean; saved?: boolean; following?: boolean }) => boolean | undefined,
  ) => {
    if (!requireAuth()) return;
    set(!current);
    startAction(async () => {
      const r = await fn().catch(() => null);
      if (r) {
        const v = read(r);
        if (typeof v === "boolean") set(v);
      }
    });
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

  /** CALL · NVDA · AUG 22, 2026 · 0:58. A callless publication has no ticker,
   * so its theme tag takes that slot and the strip still reads as a dateline. */
  const dateline = [
    pub.typeLabel,
    pub.ticker ?? pub.themeTag ?? pub.sector,
    new Date(pub.publishedAt)
      .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      .toUpperCase(),
    fmt(pub.durationSeconds),
  ]
    .filter(Boolean)
    .join(" · ");

  const onClip = card === 0;

  return (
    <section
      ref={ref}
      data-feed-item={index}
      aria-label={pub.headline}
      className={cn(
        "flex snap-start snap-always flex-col items-center justify-center py-3 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))]",
        ITEM_H,
      )}
    >
      <div className="flex h-full w-full max-w-[420px] flex-col justify-center gap-2">
        {/* The dateline strip, above the frame. */}
        <div className="flex items-center justify-between gap-3">
          <span className="num truncate text-[10px] uppercase tracking-[0.18em] text-text-mute">
            {dateline}
          </span>
          <span className="num flex-none text-[10px] uppercase tracking-[0.16em] text-text-faint">
            {index + 1} / {total}
          </span>
        </div>

        {/* The stage: 9:16, height-bound so it never outgrows the viewport. */}
        <div className="relative min-h-0 flex-1">
          <div className="relative mx-auto h-full max-h-full overflow-hidden rounded-[var(--radius-card)] border border-border bg-[var(--ink)] text-[var(--paper)] [aspect-ratio:9/16]">
            <div
              ref={trackRef}
              className="scroll-area scroll-bare flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden"
            >
              {/* Panel 0: the clip. */}
              <div className="relative h-full w-full flex-none snap-center">
                {isActive && isDirectVideoUrl(pub.playbackUrl) && pub.playbackUrl ? (
                  <NativeClip
                    src={pub.playbackUrl}
                    poster={pub.thumbnailUrl}
                    muted={muted}
                    paused={paused}
                    title={pub.headline}
                    onProgress={(ratio) => {
                      if (lastRatioRef.current > 0.85 && ratio < 0.15) loopedRef.current = true;
                      lastRatioRef.current = ratio;
                      setProgress(ratio);
                      if (ratio > 0) setStarted(true);
                    }}
                  />
                ) : isActive && pub.embedUrl ? (
                  <iframe
                    ref={iframeRef}
                    src={pub.embedUrl}
                    title={pub.headline}
                    allow="autoplay; encrypted-media; picture-in-picture"
                    allowFullScreen
                    className="absolute inset-0 h-full w-full border-0"
                  />
                ) : null}
                {/*
                  The poster covers the player until the player is genuinely
                  playing, and the iframe is opaque black while an HLS stream
                  starts. Putting it behind would hide it exactly when it is
                  needed, so it sits on top and steps aside on the first frame.
                */}
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity duration-500",
                    started ? "opacity-0" : "opacity-100",
                  )}
                >
                  <ClipThumb src={pub.thumbnailUrl} seed={pub.analyst.id} loading="eager" />
                </div>

                {/* Progress. */}
                <div className="absolute inset-x-0 top-0 z-10 h-[3px] bg-white/20">
                  <div
                    className="h-full bg-white/90 transition-[width] duration-300 ease-linear"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>

                {/* Ticker and direction top-left; the seal top-right. A callless
                    publication shows neither, and anchors on its theme instead. */}
                <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.5),transparent)] p-3 pt-5">
                  <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                    {pub.ticker ? <TickerChip ticker={pub.ticker} /> : null}
                    {pub.direction ? <DirectionTag direction={pub.direction} /> : null}
                    {!pub.ticker && pub.themeTag ? <ThemeTag label={pub.themeTag} /> : null}
                  </div>
                  <div className="pointer-events-auto flex flex-none items-start gap-2">
                    {pub.seal ? (
                      <SealStamp status={pub.seal.status} date={new Date(pub.seal.dateISO)} size="sm" />
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onMutedChange(!muted)}
                      aria-label={muted ? "Unmute (M)" : "Mute (M)"}
                      className="focus-ring flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/40 text-white hover:bg-black/60"
                    >
                      {muted ? <VolumeX size={14} strokeWidth={1.6} /> : <Volume2 size={14} strokeWidth={1.6} />}
                    </button>
                  </div>
                </div>

                {/* Tap the picture to pause, the way a video expects to behave. */}
                <button
                  type="button"
                  onClick={() => setPaused((p) => !p)}
                  aria-label={paused ? "Play (Space)" : "Pause (Space)"}
                  className="absolute inset-x-0 top-14 bottom-20 w-full cursor-default"
                >
                  {paused ? (
                    <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[var(--ink)]">
                      <Play size={22} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                    </span>
                  ) : null}
                </button>

                {/* The lower third: the identity band on the picture itself. */}
                <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-[linear-gradient(to_top,rgba(0,0,0,0.75),transparent)] px-3 pb-3 pt-10">
                  <Link
                    href={`/analyst/${pub.analyst.handle}`}
                    className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded"
                  >
                    <Avatar
                      src={pub.analyst.avatarUrl}
                      name={pub.analyst.displayName}
                      size="md"
                      className="!border-white/30"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.875rem] font-semibold leading-tight text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                        {pub.analyst.displayName}
                      </span>
                      <span className="num block truncate text-[10px] uppercase tracking-[0.14em] text-white/75">
                        @{pub.analyst.handle}
                      </span>
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() =>
                      act(setFollowing, following, () => toggleFollow(pub.analyst.id), (r) => r.following)
                    }
                    aria-pressed={following}
                    className={cn(
                      "num focus-ring flex-none rounded-[var(--radius-tag)] border px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] transition-colors",
                      following
                        ? "border-white/70 bg-white/15 text-white"
                        : "border-white/45 text-white/90 hover:border-white hover:text-white",
                    )}
                  >
                    {following ? "Following" : "Follow"}
                  </button>
                </div>
              </div>

              {/* Panels 1..n: the evidence, in the same frame. */}
              {cards.map((c) => (
                <div key={c.id} className="h-full w-full flex-none snap-center bg-bg p-3 text-text">
                  <FeedCardView
                    card={c}
                    ticker={pub.ticker}
                    onSealedTap={() => unlockIndex >= 0 && setCard(unlockIndex + 1)}
                  />
                </div>
              ))}
            </div>

            {/* Sideways controls, on the frame. */}
            {card > 0 ? (
              <button
                type="button"
                onClick={() => goCard(-1)}
                aria-label="Previous card"
                className="focus-ring absolute left-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-surface text-text"
              >
                <ChevronLeft size={16} strokeWidth={1.6} />
              </button>
            ) : null}
            {card < panelCount - 1 ? (
              <button
                type="button"
                onClick={() => goCard(1)}
                aria-label="Next card"
                className={cn(
                  "focus-ring absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border",
                  onClip
                    ? "border-white/25 bg-black/40 text-white hover:bg-black/60"
                    : "border-border bg-surface text-text",
                )}
              >
                <ChevronRight size={16} strokeWidth={1.6} />
              </button>
            ) : null}
          </div>
        </div>

        {/* The headline sits under the frame, where it does not crowd the face. */}
        <h2 className="line-clamp-2 font-display text-[1.0625rem] font-semibold leading-[1.2] tracking-tight">
          {pub.headline}
        </h2>

        {/* The editorial action bar, and the pager at its right end. */}
        <div className="flex items-center justify-between gap-3 border-y border-border py-2.5">
          <div className="flex items-center gap-3 sm:gap-4" role="group" aria-label="Actions">
            {(
              [
                {
                  key: "like",
                  label: liked ? "Liked" : "Like",
                  Icon: Heart,
                  on: () => act(setLiked, liked, () => toggleLike(pub.id), (r) => r.liked),
                  active: liked,
                },
                { key: "discuss", label: "Discuss", Icon: MessageSquare, on: onDiscuss, active: false },
                {
                  key: "save",
                  label: saved ? "Saved" : "Save",
                  Icon: Bookmark,
                  on: () => act(setSaved, saved, () => toggleSave(pub.id), (r) => r.saved),
                  active: saved,
                },
                {
                  key: "share",
                  label: shared ? "Copied" : "Share",
                  Icon: Share2,
                  on: onShare,
                  active: shared,
                },
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
                    active
                      ? "border-[var(--ink)] text-text"
                      : "border-border text-text-mute group-hover:border-border-strong group-hover:text-text",
                  )}
                >
                  <Icon
                    size={13}
                    strokeWidth={1.6}
                    fill={active && (key === "like" || key === "save") ? "currentColor" : "none"}
                  />
                </span>
                <span
                  className={cn(
                    "num hidden text-[10px] uppercase tracking-[0.16em] sm:inline",
                    active ? "text-text" : "text-text-mute group-hover:text-text",
                  )}
                >
                  {label}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => unlockIndex >= 0 && setCard(unlockIndex + 1)}
            aria-label={`Panel ${card + 1} of ${panelCount}`}
            className="num focus-ring flex-none rounded text-[11px] tracking-[0.12em] text-text-mute hover:text-text"
          >
            {card + 1} / {panelCount}
          </button>
        </div>
      </div>
    </section>
  );
};

function EndOfFeed() {
  return (
    <section className={cn("flex snap-start items-center justify-center px-4", ITEM_H)} aria-label="End of feed">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-[var(--radius-card)] border border-border p-9 text-center">
        <span className="num text-[10px] uppercase tracking-[0.22em] text-text-mute">End of feed</span>
        <p className="font-display text-[1.75rem] font-semibold leading-tight">You are caught up.</p>
        <p className="text-[0.875rem] leading-relaxed text-text-mute">
          New calls publish at market open. Catch the morning edition on Today, or browse analysts by
          sector on Explore.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href="/home" className={buttonClass("primary", "md")}>
            Go to Today
          </Link>
          <Link href="/explore" className={buttonClass("secondary", "md")}>
            Open Explore
          </Link>
        </div>
      </div>
    </section>
  );
}

/** The discussion, as a panel over the stage rather than a page beneath it:
 * the Feed is one viewport per publication and has nothing below the fold. */
function DiscussionPanel({
  pub,
  canPost,
  onPost,
  onClose,
}: {
  pub: FeedPublication;
  canPost: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
  onClose: () => void;
}) {
  const [extra, setExtra] = useState<FeedComment[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-[color-mix(in_srgb,var(--ink)_55%,transparent)] md:items-stretch md:justify-end">
      <button type="button" aria-label="Close discussion" onClick={onClose} className="absolute inset-0 md:static md:flex-1" />
      <div className="relative flex max-h-[min(88svh,100%)] w-full flex-col overflow-y-auto rounded-t-[var(--radius-card)] bg-bg p-4 pb-[max(1rem,var(--safe-bottom))] md:h-full md:max-h-none md:max-w-[460px] md:rounded-none">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="num text-[10px] uppercase tracking-[0.2em] text-text-mute">
              Discussion{pub.ticker ? ` · ${pub.ticker}` : ""}
            </span>
            <p className="mt-1 line-clamp-2 font-display text-[1.0625rem] font-semibold leading-tight">
              {pub.headline}
            </p>
          </div>
          <button type="button" onClick={onClose} className={buttonClass("secondary", "sm", "flex-none")}>
            Close
          </button>
        </div>
        <FeedDiscussion
          comments={[...extra, ...pub.comments]}
          canPost={canPost}
          onPost={
            onPost
              ? async (text, parentId) => {
                  const posted = await onPost(pub.id, text, parentId);
                  if (posted) setExtra((e) => [posted, ...e]);
                }
              : undefined
          }
        />
      </div>
    </div>
  );
}
