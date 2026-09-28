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
import { loadFeedComments } from "@/app/actions/feed";
import { Avatar } from "@/components/ui/avatar";
import { FeedCardView } from "@/components/feed/feed-cards";
import { DiscussionThread, type DiscussionActions } from "@/components/discussion/discussion-thread";
import { trackEngagement } from "@/lib/engagement/track-client";
import { trackVideoEvent } from "@/lib/video/track-client";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { NativeClip } from "@/components/video/native-clip";
import { ScrubBar } from "@/components/video/scrub-bar";
import { OverlayLayer } from "@/components/video/overlay-layer";
import { prefetchVideoStart, warmVideoConnections } from "@/lib/video/prefetch";
import { prefersReducedMotion } from "@/lib/motion/reduced";
import { useStoredValue } from "@/lib/hooks/use-stored-value";
import { useFrameHeight } from "@/components/layout/scroll-frame";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { isPlayableVideoUrl } from "@/lib/video/direct";
import type { FeedComment, FeedPublication } from "@/lib/feed/types";
import { StanceCard } from "@/components/feed/stance-card";
import { compact } from "@/lib/format";
import { labelCase } from "@/lib/design/label";

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
 * Only the publication in view plays. Neighbors keep a paused player so the
 * next flick does not start from a black frame.
 */

/**
 * The room under the top nav. The scroller and every snap section have to
 * agree on this exactly: any disagreement and each snap lands a little further
 * off than the last. The class carries the server's guess from the nav and tab
 * tokens; once mounted, the surface measures its real room off its scroller
 * and every element in the class reads that instead (`--feed-h`).
 */
const ITEM_H = "feed-snap";

/**
 * Anything smaller than this is not a reader, it is a measurement that went
 * wrong (a scroller with no height of its own, a hidden document). The guess
 * in the class stands then, so a failed measurement never sizes the Feed to
 * nothing; the worst case is the page scrolling like any other page.
 */
const MIN_FEED_ROOM = 240;

function applyFeedRoom(root: HTMLElement, height: number) {
  if (height >= MIN_FEED_ROOM) root.style.setProperty("--feed-h", `${height}px`);
  else root.style.removeProperty("--feed-h");
}

/** The Explore overlay is the viewport itself; its class height is the measure. */
function keepClassRoom() {}

/**
 * The reader's sound choice, remembered.
 *
 * Muted autoplay is correct (and required by every mobile browser), but a
 * reader who deliberately turned sound on should not have to do it again on
 * the next clip, the next navigation or tomorrow. Re-muting forever is a tax
 * paid on every session.
 */
const SOUND_KEY = "stoa_feed_sound";
const SOUND_EVENT = "stoa-feed-sound";

function parseMuted(raw: string | null): boolean {
  return raw !== "on";
}

/** Retention checkpoints. The curve is what tells us whether a clip held. */
const PROGRESS_MARKS = [0.25, 0.5, 0.75, 0.95] as const;

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
  discussionActions,
  sessionId,
  embedded = false,
  onBack,
  backButton = true,
  snapClass,
  sideways = "cards",
  rememberSound = true,
  surface = "feed",
  signInNext = "/feed",
  onActiveChange,
  onEnd,
  endSlot,
}: {
  publications: FeedPublication[];
  startIndex?: number;
  /** Signed in: like, save and follow act; otherwise they route to sign-in. */
  canAct?: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
  /** Like and delete overrides; the real pages leave this out and use the server actions. */
  discussionActions?: Partial<Omit<DiscussionActions, "post">>;
  sessionId?: string;
  /** Full-viewport overlay (Explore). Height does not subtract the top nav. */
  embedded?: boolean;
  /** Escape calls this; the surface also draws its own back button unless `backButton` is false. */
  onBack?: () => void;
  backButton?: boolean;
  /** The height class every snap section shares, when the host sizes the room itself. */
  snapClass?: string;
  /**
   * What a sideways swipe and the left and right arrows move through. "cards"
   * is the evidence track; "host" leaves both to whatever holds the surface
   * (Today's faces move between analysts), and the cards stay reachable by
   * their chevrons.
   */
  sideways?: "cards" | "host";
  /**
   * The Feed remembers a reader who turned sound on. A host that must never
   * start with sound passes false: every opening starts muted and the choice
   * lasts only while it is open.
   */
  rememberSound?: boolean;
  /** Logged with every engagement and view event. */
  surface?: "feed" | "explore" | "today";
  /** Where sign-in returns the reader to after a like, save, follow or gated clip. */
  signInNext?: string;
  onActiveChange?: (index: number) => void;
  /**
   * Called when the reader comes to the end: scrolls past the last
   * publication, or watches its clip through. With it, each finished clip
   * also moves on to the next, and `endSlot` replaces the end-of-feed card.
   */
  onEnd?: () => void;
  endSlot?: React.ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const roomRef = useFrameHeight<HTMLDivElement>(embedded ? keepClassRoom : applyFeedRoom);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(Math.min(startIndex, Math.max(0, publications.length - 1)));
  const storedMuted = useStoredValue(SOUND_KEY, parseMuted, true, SOUND_EVENT);
  const [localMuted, setLocalMuted] = useState(true);
  const muted = rememberSound ? storedMuted : localMuted;
  const setMuted = useCallback(
    (next: boolean) => {
      if (!rememberSound) {
        setLocalMuted(next);
        return;
      }
      try {
        localStorage.setItem(SOUND_KEY, next ? "off" : "on");
        window.dispatchEvent(new Event(SOUND_EVENT));
      } catch {
        // Private mode: the toggle still works for this view.
      }
    },
    [rememberSound],
  );
  const [discussing, setDiscussing] = useState<string | null>(null);

  // Which publication is on screen. `rootMargin` collapses the observation box
  // to a band across the middle, so exactly one section is ever the active one
  // however tall the viewport is.
  //
  // A section entering the band takes over at once, so the next clip starts
  // as it arrives. One leaving it hands back to whatever is still there: a
  // gesture too short to carry to the next publication springs back (Chrome
  // does this with any wheel or trackpad movement under half the screen), and
  // without the hand-back the Feed stayed on the one that had only peeked in,
  // playing it off screen while the clip in view sat paused.
  useEffect(() => {
    const root = scrollerRef.current;
    if (!root) return;
    const inBand = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = itemRefs.current.indexOf(e.target as HTMLElement);
          if (i < 0) continue;
          if (e.isIntersecting) {
            inBand.add(i);
            setActive(i);
          } else {
            inBand.delete(i);
          }
        }
        if (inBand.size === 1) setActive([...inBand][0]);
      },
      { root, rootMargin: "-45% 0px -45% 0px", threshold: 0 },
    );
    for (const el of itemRefs.current) if (el) io.observe(el);
    return () => io.disconnect();
  }, [publications.length]);

  const snapH = snapClass ?? (embedded ? "feed-snap-overlay" : ITEM_H);

  useEffect(() => {
    onActiveChange?.(active);
  }, [active, onActiveChange]);

  // The end section coming into view is the reader asking for what follows.
  useEffect(() => {
    if (onEnd && active === publications.length) onEnd();
  }, [active, publications.length, onEnd]);

  useEffect(() => {
    const pub = publications[active];
    const next = publications[active + 1];
    const prev = publications[active - 1];
    for (const p of [pub, next, prev]) {
      if (!p) continue;
      warmVideoConnections(p.playbackUrl, p.embedUrl);
      void prefetchVideoStart(p.playbackUrl);
    }
  }, [active, publications]);

  // Land on the requested publication without animating past everything above
  // it, which is what Explore's tiles need when they open the Feed part-way in.
  useEffect(() => {
    const root = scrollerRef.current;
    const target = itemRefs.current[startIndex];
    if (!root || !target) return;
    const id = requestAnimationFrame(() => {
      root.scrollTo({ top: target.offsetTop, behavior: "auto" });
    });
    return () => cancelAnimationFrame(id);
  }, [startIndex, publications.length]);

  const goTo = useCallback((i: number) => {
    const root = scrollerRef.current;
    const target = itemRefs.current[i];
    const last = onEnd ? publications.length : publications.length - 1;
    if (!root || !target || i < 0 || i > last) return;
    root.scrollTo({
      top: target.offsetTop,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [publications.length, onEnd]);

  useEffect(() => {
    if (!onBack) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (discussing) return;
      onBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, discussing]);

  return (
    <div ref={roomRef} className={cn("relative", snapH)}>
      {onBack && backButton ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to Explore"
          className="focus-ring absolute left-[max(0.75rem,var(--safe-left))] top-[calc(0.75rem+var(--safe-top))] z-20 flex h-9 w-9 items-center justify-center rounded-full bg-surface text-text shadow-card"
        >
          <ChevronLeft size={18} strokeWidth={1.6} />
        </button>
      ) : null}
      <div
        ref={scrollerRef}
        className={cn(
          "scroll-area scroll-bare snap-y snap-mandatory overflow-y-auto overflow-x-hidden overscroll-contain bg-bg",
          snapH,
        )}
      >
        {publications.map((pub, i) => (
          <FeedItem
            key={pub.clipId ?? pub.id}
            ref={(el) => {
              itemRefs.current[i] = el;
            }}
            pub={pub}
            index={i}
            isActive={i === active}
            near={Math.abs(i - active) <= 1}
            snapClass={snapH}
            muted={muted}
            onMutedChange={setMuted}
            canAct={canAct}
            onPrev={() => goTo(i - 1)}
            onNext={() => goTo(i + 1)}
            onFinished={onEnd ? () => goTo(i + 1) : undefined}
            onDiscuss={() => setDiscussing(pub.id)}
            sessionId={sessionId}
            sideways={sideways}
            surface={surface}
            signInNext={signInNext}
            clearBack={Boolean(onBack && backButton)}
          />
        ))}

        {onEnd ? (
          <section
            ref={(el) => {
              itemRefs.current[publications.length] = el;
            }}
            aria-label="Up next"
            className={cn("flex snap-start items-center justify-center px-4", snapH)}
          >
            {endSlot}
          </section>
        ) : (
          <EndOfFeed snapClass={snapH} />
        )}
      </div>

      {discussing ? (
        <DiscussionPanel
          key={discussing}
          pub={publications.find((p) => p.id === discussing)!}
          canPost={canAct}
          onPost={onPost}
          discussionActions={discussionActions}
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
  isActive,
  near,
  snapClass,
  muted,
  onMutedChange,
  canAct,
  onPrev,
  onNext,
  onFinished,
  onDiscuss,
  sessionId,
  sideways,
  surface,
  signInNext,
  clearBack,
}: {
  ref: (el: HTMLElement | null) => void;
  pub: FeedPublication;
  index: number;
  isActive: boolean;
  near: boolean;
  snapClass: string;
  muted: boolean;
  onMutedChange: (m: boolean) => void;
  canAct: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** The clip played through once; the host moves on. */
  onFinished?: () => void;
  onDiscuss: () => void;
  sessionId?: string;
  sideways: "cards" | "host";
  surface: "feed" | "explore" | "today";
  signInNext: string;
  /** The host's back button sits over the stage's top-left corner on a phone. */
  clearBack: boolean;
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
  // Playback position, only tracked when the publication carries overlays.
  const [clipTime, setClipTime] = useState(0);
  const [liked, setLiked] = useState(() => Boolean(pub.likedByMe));
  const [saved, setSaved] = useState(() => Boolean(pub.savedByMe));
  const [following, setFollowing] = useState(() => Boolean(pub.followingAnalyst));
  const [shared, setShared] = useState(false);
  const lastRatioRef = useRef(0);
  const loopedRef = useRef(false);
  const trackedPlayRef = useRef(false);
  const clickTrackedRef = useRef(false);
  const marksSentRef = useRef(0);
  /**
   * Set when our own player cannot play the stream (a pull zone that refuses
   * the manifest, a dead file). The provider's embed authenticates itself, so
   * it is the fallback rather than an error state.
   */
  const [streamFailed, setStreamFailed] = useState(false);
  const onUnplayable = useCallback(() => setStreamFailed(true), []);
  // The scrub bar's hand on the player, and whether a finger is holding it.
  const seekRef = useRef<((ratio: number) => void) | null>(null);
  const [scrubbing, setScrubbing] = useState(false);
  // How much of the frame the chrome covers, top and bottom, so the analyst's
  // own overlays can be kept clear of it. Written as CSS variables on the
  // panel rather than state: it changes with the headline's length and the
  // tab pill, and nothing but the overlay positions reads it.
  const panelRef = useRef<HTMLDivElement>(null);
  const topChromeRef = useRef<HTMLDivElement>(null);
  const bottomChromeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = panelRef.current;
    const top = topChromeRef.current;
    const bottom = bottomChromeRef.current;
    if (!panel || !top || !bottom) return;
    const measure = () => {
      panel.style.setProperty("--chrome-t", `${top.offsetHeight}px`);
      panel.style.setProperty("--chrome-b", `${bottom.offsetHeight}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(top);
    ro.observe(bottom);
    return () => ro.disconnect();
  }, []);

  /**
   * Report how far the reader actually got, at fixed checkpoints.
   *
   * Sent as quartiles rather than continuously: the useful output is a
   * drop-off curve, and one event per timeupdate would be hundreds of events
   * per clip. Each mark fires once per visit to the publication.
   */
  const trackProgress = useCallback(
    (ratio: number) => {
      while (
        marksSentRef.current < PROGRESS_MARKS.length &&
        ratio >= PROGRESS_MARKS[marksSentRef.current]
      ) {
        const mark = PROGRESS_MARKS[marksSentRef.current];
        marksSentRef.current += 1;
        trackEngagement({
          reportId: pub.id,
          kind: "watch_progress",
          value: Math.round(mark * 100),
          surface,
        });
      }
    },
    [pub.id, surface],
  );

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
    const t = setTimeout(() => setStarted(true), 400);
    return () => clearTimeout(t);
  }, [isActive]);

  const cards = useMemo(() => pub.cards ?? [], [pub]);
  // The closing card: the unlock card on a gated piece, the read card on a
  // free one. The page counter and a sealed card's tap both jump to it.
  const unlockIndex = cards.findIndex((c) => c.kind === "unlock" || c.kind === "read");
  // The clip is the first panel of the track; the evidence follows it.
  const panelCount = cards.length + 1;

  // Coming back to a publication should find the analyst's face, not wherever
  // the reader stopped reading. Adjusted during render rather than in an
  // effect: resetting from an effect schedules a second render pass over the
  // whole item every time one scrolls out of view, and this is the case React
  // supports adjusting for directly.
  const [wasNear, setWasNear] = useState(near);
  if (wasNear !== near) {
    setWasNear(near);
    if (!near) {
      setCard(0);
      setPaused(false);
      setProgress(0);
      setStarted(false);
    }
  }

  useEffect(() => {
    if (!isActive) return;
    trackEngagement({ reportId: pub.id, kind: "impression", surface });
    if (pub.clipId) trackEngagement({ reportId: pub.id, kind: "play", surface });
    trackEngagement({ reportId: pub.id, kind: "swipe_depth", value: index, surface });
  }, [isActive, pub.id, pub.clipId, index, surface]);

  useEffect(() => {
    if (!pub.clipId) return;
    if (isActive) {
      if (!trackedPlayRef.current) {
        trackedPlayRef.current = true;
        loopedRef.current = false;
        lastRatioRef.current = 0;
        marksSentRef.current = 0;
        trackVideoEvent(pub.clipId, {
          watchedSeconds: 0,
          sessionId,
          videoLengthSeconds: pub.durationSeconds,
          surface,
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
        surface,
        positionInFeed: index,
      });
    }
    trackedPlayRef.current = false;
    clickTrackedRef.current = false;
  }, [isActive, pub.clipId, pub.durationSeconds, index, sessionId, surface]);

  useEffect(() => {
    if (isActive && unlockIndex >= 0 && card === unlockIndex + 1) {
      trackEngagement({ reportId: pub.id, kind: "cta_reach", value: card, surface });
      if (pub.clipId && !clickTrackedRef.current) {
        clickTrackedRef.current = true;
        trackVideoEvent(pub.clipId, {
          clickedThroughToReport: true,
          sessionId,
          videoLengthSeconds: pub.durationSeconds,
          surface,
          positionInFeed: index,
        });
      }
    }
  }, [isActive, card, unlockIndex, pub.id, pub.clipId, pub.durationSeconds, index, sessionId, surface]);

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
          trackProgress(ratio);
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
  }, [isActive, muted, trackProgress]);

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
    // Held still while the bar is being dragged: the finger is the position.
    if (!isActive || !started || paused || scrubbing) return;
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
  }, [isActive, started, paused, scrubbing, pub.durationSeconds]);

  /**
   * Through once: the bar reached its end, or the clip went back to its start
   * on its own (a loop, which can come before the bar's end when a stored
   * length disagrees with the file). Only after the clip has played in this
   * visit, so coming back to one that finished earlier does not skip straight
   * past it; a finger on the bar is never a finish.
   */
  const through = useRef({ armed: false, last: 0, done: false });
  useEffect(() => {
    if (!isActive) through.current = { armed: false, last: 0, done: false };
  }, [isActive]);
  useEffect(() => {
    const t = through.current;
    if (!onFinished || !isActive || t.done) return;
    const last = t.last;
    t.last = progress;
    if (scrubbing) {
      t.armed = false;
      return;
    }
    if (progress < 0.9) t.armed = true;
    if (!t.armed) return;
    if (progress >= 0.995 || (last > 0.3 && progress < 0.1 && last - progress > 0.25)) {
      t.done = true;
      onFinished();
    }
  }, [progress, isActive, scrubbing, onFinished]);

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
    el.scrollTo({
      left,
      behavior: document.hidden || prefersReducedMotion() ? "auto" : "smooth",
    });
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
          if (sideways === "host") break;
          e.preventDefault();
          goCard(-1);
          break;
        case "ArrowRight": {
          if (sideways === "host") break;
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
  }, [isActive, goCard, onNext, onPrev, muted, onMutedChange, unlockIndex, sideways]);

  const requireAuth = () => {
    if (canAct) return true;
    router.push(`/sign-in?next=${encodeURIComponent(signInNext)}`);
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

  /** No clip to play: a written piece, or a clip this reader must sign in to stream. */
  const written = !pub.clipId && !pub.watchGated;
  const stageOnly = written || Boolean(pub.watchGated);
  const onClip = card === 0;

  /** Trending · Thesis · Aug 22, 2026 · 0:58. The ticker is on the stance card, in its own face. */
  const dateline = [
    pub.stageMarker === "TRENDING" ? "Trending" : pub.stageMarker === "NEW" ? "New" : null,
    labelCase(pub.typeLabel),
    new Date(pub.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    stageOnly ? null : fmt(pub.durationSeconds),
  ]
    .filter(Boolean)
    .join(" · ");

  // The count moves with the reader's own follow, so pressing Follow is seen to land.
  const followers =
    pub.analyst.followers == null
      ? null
      : pub.analyst.followers + (following ? 1 : 0) - (pub.followingAnalyst ? 1 : 0);
  const audience =
    followers != null && followers > 0
      ? `${compact(followers)} ${followers === 1 ? "follower" : "followers"}`
      : `@${pub.analyst.handle}`;

  const actions = [
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
  ] as const;

  const pager = (
    <button
      type="button"
      onClick={() => unlockIndex >= 0 && setCard(unlockIndex + 1)}
      aria-label={`Card ${card + 1} of ${panelCount}. Go to the last card`}
      className="focus-ring tap-target flex-none whitespace-nowrap rounded-button px-1 text-ticker font-semibold"
    >
      {card + 1} / {panelCount}
    </button>
  );

  return (
    <section
      ref={ref}
      data-feed-item={index}
      data-active={isActive ? "" : undefined}
      aria-label={pub.headline}
      className={cn(
        "feed-item-shell flex snap-start snap-always flex-col items-center justify-center",
        "py-0 pl-0 pr-0 md:py-3 md:pl-[max(1rem,var(--safe-left))] md:pr-[max(1rem,var(--safe-right))]",
        snapClass,
      )}
    >
      <div className="flex h-full w-full max-w-none flex-col justify-center gap-0 md:max-w-[420px] md:gap-2">
        {/* The dateline strip, above the frame on desktop. On a phone it sits on the picture. */}
        <p className="hidden truncate text-ticker text-text-mute md:block">{dateline}</p>

        {/* Phone: the stage is the viewport. Desktop: 9:16 card, height-bound. */}
        <div className="relative min-h-0 flex-1">
          <div
            className={cn(
              "relative h-full w-full overflow-hidden bg-[var(--ink)] text-[var(--paper)]",
              "md:mx-auto md:max-h-full md:rounded-panel md:[aspect-ratio:9/16]",
            )}
          >
            <div
              ref={trackRef}
              className={cn(
                "scroll-area-x scroll-bare flex h-full snap-x snap-mandatory overflow-y-hidden",
                // Left to the host: the track still moves by its chevrons, a finger's sideways swipe does not.
                sideways === "host" ? "touch-pan-y overflow-x-hidden" : "overflow-x-auto",
              )}
            >
              {/* Panel 0: the clip. */}
              <div ref={panelRef} className="relative h-full w-full flex-none snap-center">
                {near && !streamFailed && isPlayableVideoUrl(pub.playbackUrl) && pub.playbackUrl ? (
                  <NativeClip
                    src={pub.playbackUrl}
                    poster={pub.thumbnailUrl}
                    muted={muted}
                    paused={!isActive || paused}
                    title={pub.headline}
                    previewSeconds={pub.feedPreviewSeconds}
                    trimStart={pub.videoEdit?.trimStart ?? 0}
                    trimEnd={pub.videoEdit && pub.videoEdit.trimEnd > 0 ? pub.videoEdit.trimEnd : null}
                    preload={isActive ? "auto" : "metadata"}
                    captionUrl={pub.captionUrl}
                    onUnplayable={onUnplayable}
                    seekRef={seekRef}
                    onTime={pub.videoEdit && isActive ? setClipTime : undefined}
                    onProgress={
                      isActive
                        ? (ratio) => {
                            if (lastRatioRef.current > 0.85 && ratio < 0.15) loopedRef.current = true;
                            lastRatioRef.current = ratio;
                            setProgress(ratio);
                            trackProgress(ratio);
                            if (ratio > 0) setStarted(true);
                          }
                        : undefined
                    }
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
                {/* The stored edit's overlays, in time with our own player. The
                    iframe fallback cannot carry them: nothing outside it knows
                    the playhead. */}
                {pub.videoEdit && started && !streamFailed && isPlayableVideoUrl(pub.playbackUrl) ? (
                  <OverlayLayer
                    overlays={pub.videoEdit.overlays}
                    cards={pub.videoEdit.cards}
                    time={clipTime}
                    ticker={pub.ticker ?? undefined}
                    sealLocked
                    clearTop="calc(var(--chrome-t, 6.5rem) + 0.5rem)"
                    clearBottom="calc(var(--chrome-b, 16rem) + 0.5rem)"
                  />
                ) : null}
                <div
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-0 transition-opacity duration-[var(--dur-3)] ease-[var(--ease-out)]",
                    started ? "opacity-0" : "opacity-100",
                  )}
                >
                  <ClipThumb src={pub.thumbnailUrl} seed={pub.analyst.id} loading="eager" />
                </div>

                {stageOnly ? (
                  <StillStage
                    pub={pub}
                    written={written}
                    signInHref={`/sign-in?next=${encodeURIComponent(signInNext)}`}
                  />
                ) : null}

                {/* The whole picture pauses and resumes. The chrome above it lets
                    taps through everywhere except its own controls. */}
                {stageOnly ? null : (
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? "Play (Space)" : "Pause (Space)"}
                    className="absolute inset-0 z-[1] flex w-full cursor-default items-center justify-center"
                  >
                    {paused ? (
                      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-[var(--ink)]">
                        <Play size={22} fill="currentColor" strokeWidth={0} className="ml-0.5" />
                      </span>
                    ) : null}
                  </button>
                )}

                {/* Two scrims, one per edge, sized from the chrome they carry
                    (the item measures it) rather than from the frame: strong
                    behind every line of white words, even on a white frame,
                    and fading over a short stretch above, so a one-line
                    headline darkens less of the picture than a three-line one
                    and neither reaches the face in the middle. The stance card
                    is opaque paper and needs none. */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 z-[11] h-[calc(6rem+var(--feed-safe-top,0px))] bg-[linear-gradient(to_bottom,rgba(0,0,0,0.6),rgba(0,0,0,0.5)_calc(2.75rem+var(--feed-safe-top,0px)),rgba(0,0,0,0.14)_75%,transparent)]"
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 z-[11] h-[calc(var(--chrome-b,16rem)+5rem)] bg-[linear-gradient(to_top,rgba(0,0,0,0.72),rgba(0,0,0,0.56)_calc(100%_-_5rem),rgba(0,0,0,0.22)_calc(100%_-_2.5rem),transparent)]"
                />

                <div
                  ref={topChromeRef}
                  className="pointer-events-none absolute inset-x-0 top-0 z-[12] flex flex-col items-start gap-2.5 px-3 pt-[calc(0.75rem+var(--feed-safe-top,0px))]"
                >
                  <div className="flex w-full items-center justify-between gap-3">
                    <p
                      className={cn(
                        "min-w-0 truncate pl-1 text-ticker font-semibold text-white [text-shadow:0_1px_2px_rgba(0,0,0,0.6)] md:invisible",
                        clearBack && "max-md:pl-11",
                      )}
                    >
                      {dateline}
                    </p>
                    {stageOnly ? null : (
                      <button
                        type="button"
                        onClick={() => onMutedChange(!muted)}
                        aria-label={muted ? "Unmute (M)" : "Mute (M)"}
                        aria-pressed={!muted}
                        className="focus-ring tap-target pointer-events-auto flex h-9 w-9 flex-none items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60"
                      >
                        {muted ? <VolumeX size={16} strokeWidth={1.8} /> : <Volume2 size={16} strokeWidth={1.8} />}
                      </button>
                    )}
                  </div>
                  <StanceCard pub={pub} />
                </div>

                {/* Pads itself clear of the floating tab pill (`--tab-h`), or of the
                    home bar where a full-screen host has no pill, since the clip
                    runs the full height beneath both. */}
                <div ref={bottomChromeRef} className="pointer-events-none absolute inset-x-0 bottom-0 z-[12] px-4 pb-[calc(0.25rem+max(var(--tab-h),var(--feed-safe-bottom,0px)))] text-white">
                  {stageOnly ? null : (
                    <h2
                      dir="auto"
                      className="user-copy mb-3 line-clamp-3 font-display text-headline font-extrabold leading-[1.08] tracking-[-0.03em] [text-shadow:0_1px_3px_rgba(0,0,0,0.45)] md:text-title md:font-bold md:leading-[1.15] md:tracking-[-0.015em]"
                    >
                      {pub.headline}
                    </h2>
                  )}
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/analyst/${pub.analyst.handle}`}
                      className="focus-ring pointer-events-auto flex min-w-0 flex-1 items-center gap-2.5 rounded-button"
                    >
                      <Avatar
                        src={pub.analyst.avatarUrl}
                        name={pub.analyst.displayName}
                        size={38}
                        className="shadow-[0_0_0_2px_#fff]"
                      />
                      <span className="min-w-0 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
                        <span dir="auto" className="user-copy block truncate text-body font-semibold leading-tight">
                          {pub.analyst.displayName}
                        </span>
                        <span className="block truncate text-ticker leading-snug text-white/80">{audience}</span>
                      </span>
                    </Link>
                    <button
                      type="button"
                      onClick={() =>
                        act(setFollowing, following, () => toggleFollow(pub.analyst.id), (r) => r.following)
                      }
                      aria-pressed={following}
                      className={cn(
                        "focus-ring tap-target pointer-events-auto inline-flex h-8 flex-none items-center rounded-button px-3.5 text-ticker font-bold transition-colors duration-[var(--dur-1)] ease-[var(--ease-hover)]",
                        following ? "bg-black/30 shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.75)]" : "bg-coral",
                      )}
                    >
                      {following ? "Following" : "Follow"}
                    </button>
                  </div>
                  {stageOnly ? (
                    <div className="h-3" />
                  ) : (
                    <div className="pointer-events-auto relative mt-2 h-6">
                      <ScrubBar
                        inline
                        progress={progress}
                        onScrubbing={setScrubbing}
                        onSeek={(ratio) => {
                          const duration = pub.durationSeconds || 0;
                          if (seekRef.current) seekRef.current(ratio);
                          else if (duration > 0) {
                            // Bunny's embed takes a time, not a ratio.
                            playerCommand(iframeRef.current, "setCurrentTime", ratio * duration);
                          }
                          lastRatioRef.current = ratio;
                          setProgress(ratio);
                        }}
                      />
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3" role="group" aria-label="Actions">
                    <div className="-ml-2.5 flex items-center">
                      {actions.map(({ key, label, Icon, on, active }) => (
                        <button
                          key={key}
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            on();
                          }}
                          aria-label={label}
                          aria-pressed={key === "like" || key === "save" ? active : undefined}
                          className="focus-ring pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full text-white [filter:drop-shadow(0_1px_2px_rgba(0,0,0,0.5))]"
                        >
                          <Icon
                            size={21}
                            strokeWidth={1.8}
                            aria-hidden
                            className="pointer-events-none"
                            fill={active && (key === "like" || key === "save") ? "currentColor" : "none"}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="pointer-events-auto text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">{pager}</span>
                  </div>
                </div>
              </div>

              {near
                ? cards.map((c) => (
                    <div
                      key={c.id}
                      className="h-full w-full flex-none snap-center bg-bg p-3 pt-[calc(0.75rem+var(--feed-safe-top,0px))] pb-[calc(3.25rem+max(var(--tab-h),var(--feed-safe-bottom,0px)))] text-text"
                    >
                      <FeedCardView
                        card={c}
                        ticker={pub.ticker}
                        onSealedTap={() => unlockIndex >= 0 && setCard(unlockIndex + 1)}
                      />
                    </div>
                  ))
                : null}
            </div>

            {card > 0 ? (
              <button
                type="button"
                onClick={() => goCard(-1)}
                aria-label="Previous card"
                className="focus-ring absolute left-1.5 top-1/2 z-[14] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-text shadow-card"
              >
                <ChevronLeft size={16} strokeWidth={1.8} />
              </button>
            ) : null}
            {card < panelCount - 1 ? (
              <button
                type="button"
                onClick={() => goCard(1)}
                aria-label="Next card"
                className={cn(
                  "focus-ring absolute right-1.5 top-1/2 z-[14] flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full",
                  onClip ? "bg-black/40 text-white hover:bg-black/60" : "bg-surface text-text shadow-card",
                )}
              >
                <ChevronRight size={16} strokeWidth={1.8} />
              </button>
            ) : null}

            {/* On the evidence the picture is gone, so the headline and the pager
                sit on the paper beneath the cards, which leave them the room. */}
            {!onClip ? (
              <div className="absolute inset-x-0 bottom-0 z-[13] flex h-[calc(3.25rem+max(var(--tab-h),var(--feed-safe-bottom,0px)))] items-start justify-between gap-3 bg-bg px-4 pt-2.5 text-text">
                <p dir="auto" className="user-copy line-clamp-1 min-w-0 pt-1 font-display text-body font-bold leading-snug tracking-[-0.01em]">
                  {pub.headline}
                </p>
                <span className="text-text-mute">{pager}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
};

/**
 * The stage when there is nothing to play. A written piece is a page to read
 * rather than a black frame: the headline, the deck, and the way into the
 * full piece (its type and date are on the dateline above it). A clip the reader may not stream keeps its
 * poster behind and says what an account is for. The Feed's own chrome (the
 * chips, the actions, the analyst) stays around it unchanged.
 */
function StillStage({ pub, written, signInHref }: { pub: FeedPublication; written: boolean; signInHref: string }) {
  return (
    <div className="absolute inset-x-0 top-[calc(7rem+var(--feed-safe-top,0px))] bottom-[calc(7rem+max(var(--tab-h),var(--feed-safe-bottom,0px)))] z-[2] flex items-center justify-center px-12">
      <div
        className={cn(
          "flex max-h-full w-full max-w-[22rem] flex-col gap-3 overflow-hidden rounded-panel bg-surface p-5 text-text shadow-card",
          !written && "items-center text-center",
        )}
      >
        <p dir="auto" className="user-copy line-clamp-4 font-display text-title font-bold leading-tight tracking-[-0.015em]">
          {pub.headline}
        </p>
        {written && pub.deck ? (
          <p dir="auto" className="user-copy line-clamp-6 text-body leading-relaxed text-text-mute">
            {pub.deck}
          </p>
        ) : null}
        {written ? (
          <Link href={`/report/${pub.id}`} className={buttonClass("ink", "md", "mt-1 self-start")}>
            Read the piece
          </Link>
        ) : (
          <>
            <p className="text-body text-text-mute">Watching takes an account. Sign in and this plays here.</p>
            <Link href={signInHref} className={buttonClass("ink", "md", "mt-1")}>
              Sign in to watch
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function EndOfFeed({ snapClass }: { snapClass: string }) {
  return (
    <section className={cn("flex snap-start items-center justify-center px-4 pb-[var(--tab-h)]", snapClass)} aria-label="End of feed">
      <div className="flex w-full max-w-[420px] flex-col items-center gap-3 rounded-panel border border-border bg-surface p-9 text-center">
        <span className="num text-ticker text-text-mute">End of feed</span>
        <p className="font-display text-headline font-extrabold leading-[1.08] tracking-[-0.03em]">You are caught up.</p>
        <p className="text-body leading-relaxed text-text-mute">
          New publications appear as analysts post them. Catch the morning edition on Today, or
          browse analysts by sector on Explore.
        </p>
        <div className="mt-2 flex gap-2">
          <Link href="/home" className={buttonClass("ink", "md")}>
            Go to Today
          </Link>
          <Link href="/explore" className={buttonClass("ghost", "md")}>
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
  discussionActions,
  onClose,
}: {
  pub: FeedPublication;
  canPost: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
  discussionActions?: Partial<Omit<DiscussionActions, "post">>;
  onClose: () => void;
}) {
  const seeded = pub.comments.length > 0;
  const [comments, setComments] = useState<FeedComment[] | null>(seeded ? pub.comments : null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (seeded) return;
    let cancelled = false;
    void loadFeedComments(pub.id, pub.analyst.id)
      .then((rows) => {
        if (!cancelled) setComments(rows);
      })
      .catch(() => {
        if (!cancelled) setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pub.id, pub.analyst.id, seeded]);

  return (
    <div className="fixed inset-0 z-[60] flex items-end bg-[color-mix(in_srgb,var(--ink)_55%,transparent)] md:items-stretch md:justify-end">
      <button type="button" aria-label="Close discussion" onClick={onClose} className="absolute inset-0 md:static md:flex-1" />
      <div className="relative flex max-h-[min(88svh,100%)] w-full flex-col overflow-y-auto rounded-t-panel bg-bg p-4 pb-[max(1rem,var(--safe-bottom))] md:h-full md:max-h-none md:max-w-[460px] md:rounded-none">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p dir="auto" className="user-copy line-clamp-2 font-display text-body font-bold leading-tight">
              {pub.headline}
            </p>
          </div>
          <button type="button" onClick={onClose} className={buttonClass("ghost", "sm", "flex-none")}>
            Close
          </button>
        </div>
        {comments === null ? (
          <p className="mt-8 text-body text-text-mute">Loading discussion.</p>
        ) : (
          <DiscussionThread
            variant="panel"
            comments={comments}
            canPost={canPost}
            actions={{
              ...discussionActions,
              post: onPost
                ? async (text, parentId) => {
                    const posted = await onPost(pub.id, text, parentId);
                    if (posted) setComments((e) => [posted, ...(e ?? [])]);
                    return posted;
                  }
                : undefined,
            }}
          />
        )}
      </div>
    </div>
  );
}
