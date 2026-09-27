"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/design/cn";
import { loadFaceStories } from "@/app/actions/today";
import { postFeedComment } from "@/app/actions/feed";
import type { FeedComment, FeedPublication } from "@/lib/feed/types";
import type { TodayFace } from "@/lib/today/types";

const FaceStories = dynamic(() => import("@/components/today/face-stories").then((m) => m.FaceStories), {
  ssr: false,
});

/**
 * The people posting: circular faces with the name and beat beneath. A tap
 * opens that analyst's recent work over Today, watched the way stories are
 * (see FaceStories); Today never navigates away.
 *
 * A coral ring marks someone with something the reader has not seen, and
 * stays until the reader has watched them through: their newest piece is
 * later than the last one the reader reached the end of. Watching them
 * through clears it; it returns only when they post again. Reloading Today
 * changes nothing. Per analyst, this browser's own memory, drawn after mount
 * and never on the server.
 *
 * Only work posted after this browser first saw Today can ring, so a first
 * visit does not ring everyone for everything they ever posted. That moment
 * is stored once and never moved.
 *
 * On a phone this is the page's one sideways scroller; on a desktop the
 * faces wrap instead, so nothing on a wide screen scrolls sideways.
 */

const SINCE_KEY = "stoa:today:since";
/** The earlier rule's stamp: the last visit, replaced on every load. Read once to seed SINCE_KEY. */
const LEGACY_KEY = "stoa:today:last-looked";
const WATCHED_KEY = "stoa:today:watched";
/** Watched marks older than this describe nothing the row still shows. */
const WATCHED_KEEP_MS = 30 * 24 * 3_600_000;

/**
 * When this browser first saw Today. Set once and never replaced, so running
 * twice (React's development check) reads back the same moment. A reader
 * from before this rule starts from their last visit rather than from now.
 */
function firstSeen(): number | null {
  try {
    const stored = Number(window.localStorage.getItem(SINCE_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const legacy = Number(window.localStorage.getItem(LEGACY_KEY));
    const since = Number.isFinite(legacy) && legacy > 0 ? legacy : Date.now();
    window.localStorage.setItem(SINCE_KEY, String(since));
    window.localStorage.removeItem(LEGACY_KEY);
    return since;
  } catch {
    return null;
  }
}

type Watched = Record<string, number>;

function readWatched(): Watched {
  try {
    const raw = JSON.parse(window.localStorage.getItem(WATCHED_KEY) ?? "{}") as unknown;
    if (!raw || typeof raw !== "object") return {};
    const out: Watched = {};
    for (const [id, at] of Object.entries(raw)) if (typeof at === "number" && Number.isFinite(at)) out[id] = at;
    return out;
  } catch {
    return {};
  }
}

function writeWatched(w: Watched) {
  const cutoff = Date.now() - WATCHED_KEEP_MS;
  const kept = Object.fromEntries(Object.entries(w).filter(([, at]) => at > cutoff));
  try {
    window.localStorage.setItem(WATCHED_KEY, JSON.stringify(kept));
  } catch {
    // Private mode: the ring clears for this visit only.
  }
}

/** A dev fixture's comment post: appended locally, nothing sent. */
async function localPost(_reportId: string, text: string, parentId: string | null): Promise<FeedComment | null> {
  return {
    id: `local-${Math.random().toString(36).slice(2, 8)}`,
    parentId,
    author: { handle: "you", displayName: "You", avatarUrl: null, isAuthor: false },
    createdAt: new Date().toISOString(),
    text,
    likes: 0,
    mine: true,
  };
}

export function TodayFaces({
  people,
  today,
  signedIn = false,
  fixture,
  className,
}: {
  people: TodayFace[];
  today: boolean;
  signedIn?: boolean;
  /** Dev only: each face's work, already built, instead of asking the server. */
  fixture?: Record<string, FeedPublication[]>;
  className?: string;
}) {
  const [since, setSince] = useState<number | null>(null);
  const [watched, setWatched] = useState<Watched>({});
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage only exists after mount
    setSince(firstSeen());
    setWatched(readWatched());
  }, []);

  const [open, setOpen] = useState<number | null>(null);
  const [stories, setStories] = useState<Record<string, FeedPublication[]> | null>(fixture ?? null);
  const loading = useRef(false);
  const faceRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const portalReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  // Asked for once, on the first sign of interest, so the overlay usually
  // opens onto work that has already arrived.
  const load = useCallback(() => {
    if (stories || loading.current) return;
    loading.current = true;
    loadFaceStories(people.map((p) => p.id))
      .then(setStories)
      .catch(() => setStories({}))
      .finally(() => {
        loading.current = false;
      });
  }, [people, stories]);

  const onWatched = useCallback((analystId: string, newest: string) => {
    const at = Date.parse(newest);
    if (!Number.isFinite(at)) return;
    setWatched((w) => {
      if ((w[analystId] ?? 0) >= at) return w;
      const next = { ...readWatched(), ...w, [analystId]: at };
      writeWatched(next);
      return next;
    });
  }, []);

  const close = useCallback(() => {
    if (open != null) faceRefs.current[open]?.focus({ preventScroll: true });
    setOpen(null);
  }, [open]);

  if (people.length === 0) return null;
  const title = today ? "Posting today" : "Recently posted";
  return (
    <section aria-label={title} className={className}>
      <h2 className="t-headline text-text">{title}</h2>
      <ul className="scroll-bare -mx-5 mt-5 flex snap-x scroll-px-5 gap-4 overflow-x-auto px-5 pb-1 pt-1.5 md:mx-0 md:flex-wrap md:gap-x-5 md:gap-y-6 md:overflow-visible md:px-0">
        {people.map((p, i) => {
          const posted = Date.parse(p.lastPublishedAt);
          const fresh = since != null && posted > since && posted > (watched[p.id] ?? 0);
          return (
            <li key={p.id} className="w-[84px] shrink-0 snap-start">
              <button
                ref={(el) => {
                  faceRefs.current[i] = el;
                }}
                type="button"
                onPointerEnter={load}
                onFocus={load}
                onClick={() => {
                  load();
                  setOpen(i);
                }}
                className="focus-ring group flex w-full flex-col items-center rounded-inner text-center"
                aria-label={`${p.displayName}, watch recent work${fresh ? ", not watched yet" : ""}`}
                aria-haspopup="dialog"
              >
                <span className={cn("rounded-avatar", fresh && "today-ring")}>
                  <Avatar src={p.avatarUrl} name={p.displayName} size={72} />
                </span>
                <span className="mt-2 w-full truncate text-ticker font-semibold text-text group-hover:underline">
                  {p.displayName.split(/\s+/)[0]}
                </span>
                {p.specialty ? <span className="w-full truncate text-ticker text-text-mute">{p.specialty}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      {portalReady && open != null
        ? createPortal(
            <FaceStories
              people={people}
              startIndex={open}
              stories={stories}
              canAct={signedIn}
              onPost={fixture ? localPost : signedIn ? postFeedComment : undefined}
              onWatched={onWatched}
              onClose={close}
            />,
            document.body,
          )
        : null}
    </section>
  );
}
