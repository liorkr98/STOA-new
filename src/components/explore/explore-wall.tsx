"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Play } from "lucide-react";
import { DirectionTag } from "@/components/ui/tag";
import { packTiles, type Placed } from "@/lib/explore/pack";
import type { ExploreTile } from "@/lib/explore/wall";
import { ClipThumb } from "@/components/ui/clip-thumb";
import { FilterPicker } from "@/components/explore/filter-picker";
import { FeedSurface } from "@/components/feed/feed-surface";
import { prefetchVideoStart, warmVideoConnections } from "@/lib/video/prefetch";
import { cn } from "@/lib/design/cn";
import type { FeedComment } from "@/lib/feed/types";

/**
 * Explore: a wall of faces the reader scans and chooses from. Six columns on
 * desktop, three on mobile, 4px gaps, 4:5 tiles, sized by the Explore ranker
 * and packed without gaps. Clicking a tile opens the Feed player at that item as an
 * overlay above the wall (mobile: full-bleed with a back chevron); closing
 * returns to the exact scroll position because the wall never unmounts.
 */

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "num inline-flex items-center rounded-[var(--radius-tag)] border border-white/35 bg-black/35 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-[2px]",
        className,
      )}
    >
      {children}
    </span>
  );
}

function Tile({
  tile,
  placed,
  onOpen,
  onWarm,
}: {
  tile: ExploreTile;
  placed: { six: Placed | null; three: Placed | null };
  onOpen: () => void;
  onWarm: () => void;
}) {
  const p = tile.pub;
  const spotlight = (placed.six?.size ?? placed.three?.size) === "spotlight";
  const style = {
    "--c6": placed.six ? `${placed.six.col + 1} / span ${placed.six.w}` : "auto",
    "--r6": placed.six ? `${placed.six.row + 1} / span ${placed.six.h}` : "auto",
    "--c3": placed.three ? `${placed.three.col + 1} / span ${placed.three.w}` : "auto",
    "--r3": placed.three ? `${placed.three.row + 1} / span ${placed.three.h}` : "auto",
  } as React.CSSProperties;
  const dur = `${Math.floor(p.durationSeconds / 60)}:${String(Math.round(p.durationSeconds % 60)).padStart(2, "0")}`;

  return (
    <button
      type="button"
      onClick={onOpen}
      onPointerDown={onWarm}
      style={style}
      className={cn(
        "explore-tile group relative overflow-hidden bg-[var(--ink)] text-left text-white focus-ring",
        !placed.three && "hidden md:block",
        !placed.six && "md:hidden",
      )}
      aria-label={`${p.headline} by ${p.analyst.displayName}`}
    >
      <ClipThumb src={p.thumbnailUrl} seed={p.analyst.id} />
      {/* Scrim: transparent at ~60% height, ~55% black at the base. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-[linear-gradient(to_top,rgba(0,0,0,0.55),rgba(0,0,0,0.25)_45%,transparent)]" />

      <div className="absolute left-2 right-9 top-2 flex flex-wrap items-center gap-1">
        {p.ticker ? <Chip>{p.ticker}</Chip> : p.themeTag ? <Chip>{p.themeTag}</Chip> : null}
        {p.direction ? <DirectionTag direction={p.direction} /> : null}
      </div>
      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-[2px]">
        <Play size={10} fill="currentColor" strokeWidth={0} className="ml-px" />
      </span>

      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-2.5 md:p-3">
        <div className="min-w-0">
          {spotlight && tile.trending ? <div className="num mb-1 text-[10px] uppercase tracking-[0.18em] text-[var(--brass)]">Trending</div> : null}
          <h3
            dir="auto"
            className={cn(
              "user-copy font-display font-semibold leading-[1.15] tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]",
              spotlight ? "line-clamp-3 text-[1.25rem] md:text-[1.75rem]" : "line-clamp-2 text-[0.8125rem] md:text-[0.9375rem]",
            )}
          >
            {p.headline}
          </h3>
          {spotlight && p.deck ? <p dir="auto" className="user-copy mt-1 hidden line-clamp-2 text-[0.8125rem] text-white/85 md:block">{p.deck}</p> : null}
          <div dir="auto" className="user-copy mt-1 truncate text-[10px] text-white/85 md:text-[11px]">{p.analyst.displayName}</div>
        </div>
        <span className="num flex-none text-[10px] text-white/85">{dur}</span>
      </div>
    </button>
  );
}


export function ExploreWall({
  tiles,
  tickers,
  sectors,
  ticker,
  sector,
  dateline,
  basePath = "/explore",
  canAct = false,
  canWatch = false,
  onPost,
}: {
  tiles: ExploreTile[];
  tickers: string[];
  sectors: string[];
  ticker: string | null;
  sector: string | null;
  dateline: string;
  basePath?: string;
  canAct?: boolean;
  /** Signed in. Playback costs money per view, so it is account-gated. */
  canWatch?: boolean;
  onPost?: (reportId: string, text: string, parentId: string | null) => Promise<FeedComment | null>;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const watchId = search.get("watch");
  const [sessionId] = useState(() => crypto.randomUUID());
  const portalReady = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const setQuery = (mutate: (q: URLSearchParams) => void) => {
    const q = new URLSearchParams(search.toString());
    mutate(q);
    router.replace(`${basePath}${q.toString() ? `?${q}` : ""}`, { scroll: false });
  };

  const setFilter = (key: "ticker" | "sector", v: string | null) => {
    setQuery((q) => {
      if (v) q.set(key, v);
      else q.delete(key);
      if (key === "ticker") q.delete("sector");
      if (key === "sector") q.delete("ticker");
      q.delete("watch");
    });
  };

  /**
   * The overlay is the Feed player, so it follows the Feed's rule: watching
   * needs an account. Scanning the wall does not, because posters are cheap
   * and the catalogue is what makes a stranger want an account in the first
   * place.
   */
  const openWatch = (id: string) => {
    if (!canWatch) {
      const back = `${basePath}?${new URLSearchParams({ watch: id })}`;
      router.push(`/sign-in?next=${encodeURIComponent(back)}`);
      return;
    }
    setQuery((q) => {
      q.set("watch", id);
    });
  };

  const closeWatch = () => {
    setQuery((q) => {
      q.delete("watch");
    });
  };

  // The main wall is strict: sized by trending, gap-free, complete last row.
  // A filtered view is a result set: every take shown at standard size, and
  // the last row may be short.
  const filtered = Boolean(ticker || sector);
  const layouts = useMemo(() => {
    const inputs = tiles.map((t) => ({ id: t.pub.id, size: filtered ? ("standard" as const) : t.size }));
    const six = new Map(packTiles(inputs, 6, { complete: !filtered }).map((p) => [p.id, p]));
    const three = new Map(packTiles(inputs, 3, { complete: !filtered }).map((p) => [p.id, p]));
    return { six, three };
  }, [tiles, filtered]);

  const shown = tiles.filter((t) => layouts.six.has(t.pub.id) || layouts.three.has(t.pub.id));
  const publications = useMemo(() => shown.map((t) => t.pub), [shown]);
  const startIndex = Math.max(0, publications.findIndex((p) => p.id === watchId));
  const overlayOpen = Boolean(canWatch && watchId && publications.some((p) => p.id === watchId));

  useEffect(() => {
    if (!overlayOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [overlayOpen]);

  const overlay =
    portalReady && overlayOpen ? (
      createPortal(
        <div className="fixed inset-0 z-[70] bg-bg">
          <FeedSurface
            key={watchId}
            publications={publications}
            startIndex={startIndex}
            canAct={canAct}
            onPost={onPost}
            sessionId={sessionId}
            embedded
            onBack={closeWatch}
          />
        </div>,
        document.body,
      )
    ) : null;

  return (
    <div>
      {overlay}
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[var(--ink)] pb-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          {ticker ? (
            <>
              <Link href={basePath} className="num focus-ring rounded text-[11px] uppercase tracking-[0.16em] text-text-mute hover:text-text">
                ← All of Explore
              </Link>
              <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-5xl">{ticker}</h1>
              <div className="num mt-1.5 text-[11px] uppercase tracking-[0.18em] text-text-mute">Every take on this name</div>
            </>
          ) : (
            <>
              <h1 className="font-display text-3xl font-semibold tracking-tight md:text-5xl">{sector ? sector : "Explore"}</h1>
              <div className="num mt-1.5 text-[11px] uppercase tracking-[0.18em] text-text-mute">
                {sector ? (
                  <Link href={basePath} className="focus-ring rounded hover:text-text">
                    ← All of Explore
                  </Link>
                ) : (
                  dateline
                )}
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
          <FilterPicker
            label="Ticker ▾"
            searchLabel="Search tickers"
            value={ticker}
            options={tickers}
            onChange={(v) => setFilter("ticker", v)}
          />
          <FilterPicker
            label="Sector ▾"
            searchLabel="Search sectors"
            value={sector}
            options={sectors}
            onChange={(v) => setFilter("sector", v)}
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-16 text-center font-display text-lg text-text-mute">Nothing to explore yet for this filter.</p>
      ) : (
        <div className="explore-wall mt-4">
          <div className="explore-grid">
            {shown.map((t) => (
              <Tile
                key={t.pub.id}
                tile={t}
                placed={{ six: layouts.six.get(t.pub.id) ?? null, three: layouts.three.get(t.pub.id) ?? null }}
                onOpen={() => openWatch(t.pub.id)}
                onWarm={() => {
                  // Pointless for a visitor headed to sign-in, and it is their data.
                  if (!canWatch) return;
                  warmVideoConnections(t.pub.playbackUrl, t.pub.embedUrl);
                  void prefetchVideoStart(t.pub.playbackUrl);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
