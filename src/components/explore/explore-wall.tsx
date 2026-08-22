"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Play } from "lucide-react";
import { DirectionTag } from "@/components/ui/tag";
import { FeedPlayer } from "@/components/feed/feed-player";
import { packTiles, type Placed } from "@/lib/explore/pack";
import type { ExploreTile } from "@/lib/explore/wall";
import { cn } from "@/lib/design/cn";

/**
 * Explore: a wall of faces the reader scans and chooses from. Six columns on
 * desktop, three on mobile, 4px gaps, 4:5 tiles, sized by trending and packed
 * without gaps. Clicking a tile opens the Feed player at that item as an
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

function Tile({ tile, placed, onOpen }: { tile: ExploreTile; placed: { six: Placed | null; three: Placed | null }; onOpen: () => void }) {
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
      style={style}
      className={cn(
        "explore-tile group relative overflow-hidden bg-[var(--ink)] text-left text-white focus-ring",
        !placed.three && "hidden md:block",
        !placed.six && "md:hidden",
      )}
      aria-label={`${p.headline} by ${p.analyst.displayName}`}
    >
      {p.thumbnailUrl ? (
        <Image src={p.thumbnailUrl} alt="" fill sizes="(min-width: 768px) 17vw, 33vw" className="object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
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
            className={cn(
              "font-display font-semibold leading-[1.15] tracking-tight [text-shadow:0_1px_3px_rgba(0,0,0,0.6)]",
              spotlight ? "line-clamp-3 text-[1.25rem] md:text-[1.75rem]" : "line-clamp-2 text-[0.8125rem] md:text-[0.9375rem]",
            )}
          >
            {p.headline}
          </h3>
          {spotlight && p.deck ? <p className="mt-1 hidden line-clamp-2 text-[0.8125rem] text-white/85 md:block">{p.deck}</p> : null}
          <div className="mt-1 truncate text-[10px] text-white/85 md:text-[11px]">{p.analyst.displayName}</div>
        </div>
        <span className="num flex-none text-[10px] text-white/85">{dur}</span>
      </div>
    </button>
  );
}

function Dropdown({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: [string, number][];
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
        className="num focus-ring flex items-center gap-1.5 rounded text-[11px] uppercase tracking-[0.16em] text-text-mute hover:text-text"
      >
        {value ?? label}
        <ChevronDown size={12} strokeWidth={1.6} aria-hidden />
      </button>
      {open ? (
        <ul role="listbox" className="menu-pop absolute right-0 z-20 mt-2 max-h-[320px] min-w-[220px] overflow-y-auto scroll-area rounded-[var(--radius-btn)] border border-border bg-surface py-1">
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === null}
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              className={cn("num flex w-full items-center justify-between px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] hover:bg-surface-2", value === null ? "text-text" : "text-text-mute")}
            >
              All
            </button>
          </li>
          {options.map(([opt, count]) => (
            <li key={opt}>
              <button
                type="button"
                role="option"
                aria-selected={value === opt}
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={cn("num flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-[11px] uppercase tracking-[0.14em] hover:bg-surface-2", value === opt ? "text-text" : "text-text-mute")}
              >
                <span>{opt}</span>
                <span className="text-text-faint">{count}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
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
}: {
  tiles: ExploreTile[];
  tickers: [string, number][];
  sectors: [string, number][];
  ticker: string | null;
  sector: string | null;
  dateline: string;
  basePath?: string;
  /** Signed in: like, save and follow inside the player act; otherwise they route to sign-in. */
  canAct?: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  // Tagged with the filter it was opened under, so changing ticker or sector
  // closes the player during render instead of through an effect.
  const [opened, setOpened] = useState<{ scope: string; index: number } | null>(null);

  const setFilter = (key: "ticker" | "sector", v: string | null) => {
    const q = new URLSearchParams(search.toString());
    if (v) q.set(key, v);
    else q.delete(key);
    if (key === "ticker") q.delete("sector");
    if (key === "sector") q.delete("ticker");
    router.push(`${basePath}${q.toString() ? `?${q}` : ""}`, { scroll: false });
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

  const filterScope = `${ticker ?? ""}|${sector ?? ""}`;
  const openIndex = opened?.scope === filterScope ? opened.index : null;

  const shown = tiles.filter((t) => layouts.six.has(t.pub.id) || layouts.three.has(t.pub.id));
  const publications = useMemo(() => shown.map((t) => t.pub), [shown]);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[var(--ink)] pb-4">
        <div>
          {ticker ? (
            <>
              <Link href={basePath} className="num focus-ring rounded text-[11px] uppercase tracking-[0.16em] text-text-mute hover:text-text">
                ← All of Explore
              </Link>
              <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight md:text-5xl">{ticker}</h1>
              <div className="num mt-1.5 text-[11px] uppercase tracking-[0.18em] text-text-mute">Every take on this name</div>
            </>
          ) : (
            <>
              <h1 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">{sector ? sector : "Explore"}</h1>
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
        <div className="flex items-center gap-6">
          <Dropdown label="Ticker ▾" value={ticker} options={tickers} onChange={(v) => setFilter("ticker", v)} />
          <Dropdown label="Sector ▾" value={sector} options={sectors} onChange={(v) => setFilter("sector", v)} />
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="mt-16 text-center font-display text-lg text-text-mute">Nothing to explore yet for this filter.</p>
      ) : (
        <div className="explore-wall mt-4">
          <div className="explore-grid">
            {shown.map((t, i) => (
              <Tile
                key={t.pub.id}
                tile={t}
                placed={{ six: layouts.six.get(t.pub.id) ?? null, three: layouts.three.get(t.pub.id) ?? null }}
                onOpen={() => setOpened({ scope: filterScope, index: i })}
              />
            ))}
          </div>
        </div>
      )}

      {openIndex !== null ? <FeedPlayer publications={publications} startIndex={openIndex} onClose={() => setOpened(null)} canAct={canAct} /> : null}
    </div>
  );
}
