"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { FeedSurface } from "@/components/feed/feed-surface";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/design/cn";
import type { FeedComment, FeedPublication } from "@/lib/feed/types";
import type { TodayFace } from "@/lib/today/types";

/**
 * Today's faces, watched the way stories are: an overlay over Today rather
 * than a page, so Today stays exactly where it was underneath.
 *
 * Each analyst's recent work plays in the Feed's own player, one publication
 * at a time. Up and down moves through that analyst's work; sideways moves to
 * the next or previous analyst in the row, and coming to the end of one
 * analyst carries on to the next, so the row plays straight through. The
 * segments at the top say how many pieces this analyst has and which one is
 * showing.
 *
 * Closing is the X, a downward pull from the first piece, Escape, or the
 * browser's Back: opening pushes one history entry, so Back closes the
 * overlay instead of leaving Today. Sound always starts off.
 */

/** A sideways drag longer than this, and mostly sideways, changes analyst. */
const SWIPE_X = 56;
/** Drags starting this close to either side are left to the system's back swipe. */
const EDGE = 24;
/** A downward pull from the top longer than this closes. */
const PULL_CLOSE = 96;

export function FaceStories({
  people,
  startIndex,
  stories,
  canAct,
  onPost,
  onWatched,
  onClose,
}: {
  /** The faces that have something to show, in the row's order. */
  people: TodayFace[];
  startIndex: number;
  /** Recent work by analyst id; null while it loads. */
  stories: Record<string, FeedPublication[]> | null;
  canAct: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
  /** The reader reached this analyst's last piece; `newest` is the latest one's time. */
  onWatched: (analystId: string, newest: string) => void;
  onClose: () => void;
}) {
  const [at, setAt] = useState(startIndex);
  const [item, setItem] = useState(0);
  const [enter, setEnter] = useState<"next" | "prev" | null>(null);
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const [sessionId] = useState(() => crypto.randomUUID());
  const closeRef = useRef<HTMLButtonElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const face = people[at];
  const items = face && stories ? (stories[face.id] ?? []) : [];
  // The "up next" slot past the last piece still counts as the last piece.
  const shown = Math.min(item, Math.max(0, items.length - 1));

  // Back closes the overlay rather than leaving Today. One entry, pushed once
  // even when React runs this effect twice in development.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!window.history.state?.stoaStories) {
      window.history.pushState({ ...window.history.state, stoaStories: true }, "");
    }
    const onPop = () => onCloseRef.current();
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const requestClose = useCallback(() => {
    if (window.history.state?.stoaStories) window.history.back();
    else onCloseRef.current();
  }, []);

  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const goAnalyst = useCallback(
    (d: 1 | -1) => {
      let next = at + d;
      // Once the work has loaded, a face with nothing to show is passed over.
      while (stories && people[next] && (stories[people[next].id]?.length ?? 0) === 0) next += d;
      if (next >= people.length) {
        requestClose();
        return;
      }
      if (next < 0) return;
      setEnter(d === 1 ? "next" : "prev");
      setItem(0);
      setAt(next);
    },
    [at, people, stories, requestClose],
  );

  // Reaching the last piece is watching the analyst through.
  const newest = items[0]?.publishedAt;
  useEffect(() => {
    if (face && newest && items.length > 0 && item === items.length - 1) onWatched(face.id, newest);
  }, [face, newest, item, items.length, onWatched]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        goAnalyst(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goAnalyst(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goAnalyst]);

  /**
   * Sideways and downward gestures. Vertical movement stays the player's
   * native scroll-snap; only a drag that is clearly sideways changes analyst,
   * and only a pull down from the first piece, already at the top, closes.
   */
  const start = useRef<{ x: number; y: number; atTop: boolean } | null>(null);
  const scroller = () => bodyRef.current?.querySelector<HTMLElement>(".snap-y");
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (!t || e.touches.length > 1) return;
    // A drag from either edge is the system's back, which closes the overlay;
    // never another analyst. iOS starts it from the right on a right-to-left phone.
    if (t.clientX <= EDGE || t.clientX >= window.innerWidth - EDGE) {
      start.current = null;
      return;
    }
    start.current = { x: t.clientX, y: t.clientY, atTop: (scroller()?.scrollTop ?? 0) <= 2 };
  };
  const onTouchMove = (e: React.TouchEvent) => {
    const s = start.current;
    const t = e.touches[0];
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) setDrag({ x: dx, y: 0 });
    else if (s.atTop && dy > 12 && dy > Math.abs(dx) * 1.4) setDrag({ x: 0, y: dy });
    else if (drag) setDrag(null);
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const s = start.current;
    const t = e.changedTouches[0];
    start.current = null;
    setDrag(null);
    if (!s || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (Math.abs(dx) > SWIPE_X && Math.abs(dx) > Math.abs(dy) * 1.4) goAnalyst(dx < 0 ? 1 : -1);
    else if (s.atTop && dy > PULL_CLOSE && dy > Math.abs(dx) * 1.4) requestClose();
  };

  // A trackpad's two-finger sideways swipe, summed until it means something.
  const wheel = useRef({ sum: 0, lockedUntil: 0 });
  const onWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    const w = wheel.current;
    const now = Date.now();
    if (now < w.lockedUntil) return;
    w.sum += e.deltaX;
    if (Math.abs(w.sum) > 120) {
      goAnalyst(w.sum > 0 ? 1 : -1);
      w.sum = 0;
      w.lockedUntil = now + 700;
    }
  };

  const onEnd = useCallback(() => goAnalyst(1), [goAnalyst]);
  const nextFace = people[at + 1];
  const prevFace = people[at - 1];
  const pull = drag?.y ?? 0;

  if (!face) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${face.displayName}, recent work`}
      className="stories-overlay fixed inset-0 z-[70] flex flex-col bg-bg"
      style={
        pull > 0
          ? { transform: `translateY(${pull * 0.6}px)`, opacity: Math.max(0.55, 1 - pull / 600) }
          : undefined
      }
    >
      <header className="stories-head flex-none px-3 pt-[max(0.5rem,var(--safe-top))]">
        <div className="mx-auto flex h-full w-full max-w-[420px] flex-col justify-center gap-2.5">
          <div className="flex gap-1" aria-hidden>
            {(items.length ? items : [null]).map((it, i) => (
              <span
                key={it?.id ?? i}
                className={cn("h-[3px] flex-1 rounded-full", items.length && i <= shown ? "bg-text" : "bg-border")}
              />
            ))}
          </div>
          <div className="flex items-center gap-2.5">
            <Avatar src={face.avatarUrl} name={face.displayName} size="sm" />
            <p className="min-w-0 flex-1 truncate text-body">
              <span className="font-semibold text-text">{face.displayName}</span>
              <span className="num text-text-mute">
                {items.length ? ` · ${shown + 1} of ${items.length}` : ""}
              </span>
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={requestClose}
              aria-label="Close and return to Today"
              className="focus-ring flex h-9 w-9 flex-none items-center justify-center rounded-full border border-border bg-surface text-text"
            >
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>
          <span className="sr-only" aria-live="polite">
            {items.length ? `${face.displayName}, piece ${shown + 1} of ${items.length}` : ""}
          </span>
        </div>
      </header>

      <div
        ref={bodyRef}
        className="relative min-h-0 flex-1"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => {
          start.current = null;
          setDrag(null);
        }}
        onWheel={onWheel}
      >
        <div
          key={face.id}
          className={cn(
            "h-full",
            enter === "next" && "stories-enter-next",
            enter === "prev" && "stories-enter-prev",
          )}
          style={drag?.x ? { transform: `translateX(${drag.x * 0.35}px)` } : undefined}
        >
          {stories === null ? (
            <StoriesNote>Loading {face.displayName.split(/\s+/)[0]}&rsquo;s recent work.</StoriesNote>
          ) : items.length === 0 ? (
            <StoriesNote>Nothing recent to show from {face.displayName}.</StoriesNote>
          ) : (
            <FeedSurface
              publications={items}
              canAct={canAct}
              onPost={onPost}
              sessionId={sessionId}
              embedded
              onBack={requestClose}
              backButton={false}
              snapClass="feed-snap-stories"
              sideways="host"
              rememberSound={false}
              surface="today"
              signInNext="/home"
              onActiveChange={setItem}
              onEnd={onEnd}
              endSlot={
                <p className="num text-ticker text-text-mute">
                  {nextFace ? `Up next: ${nextFace.displayName}` : "That is everyone. Back to Today."}
                </p>
              }
            />
          )}
        </div>

        {prevFace ? (
          <button
            type="button"
            onClick={() => goAnalyst(-1)}
            aria-label={`Previous analyst: ${prevFace.displayName}`}
            className="focus-ring absolute left-6 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-3 text-ticker text-text md:flex"
          >
            <ChevronLeft size={16} strokeWidth={1.6} />
            <Avatar src={prevFace.avatarUrl} name={prevFace.displayName} size="sm" />
            <span className="max-w-[9rem] truncate">{prevFace.displayName.split(/\s+/)[0]}</span>
          </button>
        ) : null}
        {nextFace ? (
          <button
            type="button"
            onClick={() => goAnalyst(1)}
            aria-label={`Next analyst: ${nextFace.displayName}`}
            className="focus-ring absolute right-6 top-1/2 hidden -translate-y-1/2 items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-3 pr-1.5 text-ticker text-text md:flex"
          >
            <span className="max-w-[9rem] truncate">{nextFace.displayName.split(/\s+/)[0]}</span>
            <Avatar src={nextFace.avatarUrl} name={nextFace.displayName} size="sm" />
            <ChevronRight size={16} strokeWidth={1.6} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function StoriesNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="feed-snap-stories flex items-center justify-center px-6 text-center">
      <p className="text-body text-text-mute">{children}</p>
    </div>
  );
}
