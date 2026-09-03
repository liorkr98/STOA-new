"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toggleFollow } from "@/app/actions/social";
import { FollowTicker } from "@/components/markets/follow-control";
import * as Dialog from "@radix-ui/react-dialog";
import { PanelLeft, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { TickerChip } from "@/components/ui/ticker-chip";
import { DayChange } from "@/components/markets/day-change";
import { useInstrumentSheet } from "@/components/markets/instrument-sheet";
import { useWatchlist } from "@/lib/watchlist";
import { price as fmtPrice } from "@/lib/format";
import { cn } from "@/lib/design/cn";
import { SCROLL_COLUMN } from "@/lib/layout/frame";
import type { TodayCreatorRow, TodaySidebarPayload, TodayTicker, TodayTickerRow } from "@/lib/today/types";

/**
 * Today's left sidebar: grouped lists, each independently scrollable when it
 * holds more than fits. Persistent beside the main column on desktop; on
 * mobile it becomes a drawer opening from the left edge, never a chip strip.
 * Analysts are an avatar and a name only. Short personal lists are filled with
 * suggestions, marked as such.
 */

function SideList({ title, children, empty }: { title: string; children: ReactNode; empty?: string }) {
  const hasChildren = Array.isArray(children) ? children.some(Boolean) : Boolean(children);
  return (
    <section aria-label={title}>
      <h3 className="today-side-head">{title}</h3>
      {hasChildren ? (
        <ul className="today-side-list scroll-area mt-1.5 flex flex-col">{children}</ul>
      ) : empty ? (
        <p className="num mt-2 text-[10px] uppercase tracking-[0.12em] text-text-faint">{empty}</p>
      ) : null}
    </section>
  );
}

const quietPill =
  "num tap-target focus-ring inline-flex shrink-0 items-center rounded-[var(--radius-tag)] border border-border px-2 py-0.5 text-[0.625rem] font-medium uppercase tracking-[0.14em] text-text-faint transition-colors duration-[var(--dur-1)] hover:border-border-strong hover:text-text";

/**
 * A suggested creator carries a small outlined Follow control instead of a
 * label. On click the row follows and stays exactly where it is, joining the
 * reader's real list; the button disappears, so only suggestions carry one.
 */
function CreatorItem({ row, signedIn }: { row: TodayCreatorRow; signedIn: boolean }) {
  const router = useRouter();
  const [followed, setFollowed] = useState(false);
  const [pending, start] = useTransition();
  const showFollow = row.suggestion && !followed;

  const follow = () => {
    if (!signedIn) {
      router.push("/sign-in?next=/home");
      return;
    }
    setFollowed(true);
    start(async () => {
      const res = await toggleFollow(row.id).catch(() => null);
      if (res && res.following === false) setFollowed(false);
    });
  };

  return (
    <li className="flex items-center gap-2">
      <Link
        href={`/analyst/${row.handle}`}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-[var(--radius-btn)] py-1.5 pr-1 hover:text-text"
      >
        <Avatar src={row.avatarUrl} name={row.displayName} size="sm" />
        <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-medium text-text">{row.displayName}</span>
        {row.marker ? <span className="today-stage">{row.marker}</span> : null}
      </Link>
      {showFollow ? (
        <button type="button" onClick={follow} disabled={pending} aria-label={`Follow ${row.displayName}`} className={quietPill}>
          Follow
        </button>
      ) : null}
    </li>
  );
}

/**
 * A suggested ticker carries the outlined Follow control (browser-local
 * watchlist, no server table yet). Once followed it reads as a real row and
 * stays in place; a row already in the list shows no button.
 */
function TickerItem({ row }: { row: TodayTickerRow }) {
  const sheet = useInstrumentSheet();
  const { ready, has } = useWatchlist();
  const showFollow = row.suggestion && ready && !has(row.symbol);
  return (
    <li className="flex items-center gap-2 py-1.5">
      <button
        type="button"
        onClick={() => sheet?.open(row.symbol)}
        className="focus-ring rounded-[var(--radius-tag)]"
        aria-label={`Open ${row.symbol}`}
      >
        <TickerChip ticker={row.symbol} />
      </button>
      <span className="num ml-auto text-[0.75rem] text-text">{row.price != null ? fmtPrice(row.price) : "—"}</span>
      <DayChange percent={row.changePercent} />
      {showFollow ? <FollowTicker ticker={row.symbol} /> : null}
    </li>
  );
}

const EMPTY_ROWS: TodayTickerRow[] = [];

/** Pads a short list with suggestions the reader does not already follow. */
function pickFill(rows: TodayTickerRow[], suggested: TodayTickerRow[]): TodayTickerRow[] {
  if (rows.length >= 4) return EMPTY_ROWS;
  const ownSet = new Set(rows.map((r) => r.symbol));
  return suggested.filter((s) => !ownSet.has(s.symbol)).slice(0, 4 - rows.length);
}

/** YOUR TICKERS lives in the reader's browser until a follows table exists. */
function YourTickers({ suggested }: { suggested: TodayTickerRow[] }) {
  const { tickers, ready } = useWatchlist();
  const key = tickers.slice(0, 12).join(",");
  // Rows carry the symbol list they answered, so an empty or changed watchlist
  // resolves during render rather than being cleared from the effect.
  const [result, setResult] = useState<{ key: string; rows: TodayTickerRow[] } | null>(null);
  // Chosen once and then frozen, so following a suggestion keeps the row in
  // place instead of reshuffling the list underneath the reader.
  const [fill, setFill] = useState<TodayTickerRow[] | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    fetch(`/api/today/tickers?symbols=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : { tickers: [] }))
      .then((data: { tickers: TodayTicker[] }) => {
        if (!live) return;
        const next = (data.tickers ?? []).map((t) => ({
          symbol: t.symbol,
          price: t.price,
          changePercent: t.changePercent ?? null,
          publications: t.publicationsToday,
        }));
        setResult({ key, rows: next });
        setFill((prev) => prev ?? pickFill(next, suggested));
      })
      .catch(() => {
        if (live) setResult({ key, rows: [] });
      });
    return () => {
      live = false;
    };
  }, [key, suggested]);

  if (!ready) return <SideList title="Your tickers">{null}</SideList>;
  const own = key ? (result?.key === key ? result.rows : EMPTY_ROWS) : EMPTY_ROWS;
  // With nothing followed there is nothing to wait on, so the suggestions
  // stand in directly.
  const shownFill = key ? (fill ?? EMPTY_ROWS) : suggested.slice(0, 4);
  const fillSet = new Set(shownFill.map((r) => r.symbol));
  return (
    <SideList title="Your tickers">
      {own
        .filter((r) => !fillSet.has(r.symbol))
        .map((r) => (
          <TickerItem key={r.symbol} row={r} />
        ))}
      {shownFill.map((r) => (
        <TickerItem key={`s-${r.symbol}`} row={r} />
      ))}
    </SideList>
  );
}

export function TodaySidebarLists({ data }: { data: TodaySidebarPayload }) {
  const knownHandles = new Set([...data.memberships, ...data.following].map((c) => c.handle));
  const suggestions = data.suggestedCreators.filter((c) => !knownHandles.has(c.handle));
  const membershipFill = data.memberships.length < 3 ? suggestions.slice(0, 3 - data.memberships.length) : [];
  const followingFill =
    data.following.length < 3 ? suggestions.filter((s) => !membershipFill.includes(s)).slice(0, 3 - data.following.length) : [];

  return (
    <div className="flex flex-col gap-6">
      <SideList title="Trending creators" empty="Nothing gaining fast right now">
        {data.trendingCreators.map((c) => (
          <CreatorItem key={c.handle} row={c} signedIn={data.signedIn} />
        ))}
      </SideList>
      <SideList title="Popular creators">
        {data.popularCreators.map((c) => (
          <CreatorItem key={c.handle} row={c} signedIn={data.signedIn} />
        ))}
      </SideList>
      <SideList title="Trending tickers" empty="No names gaining fast right now">
        {data.trendingTickers.map((t) => (
          <TickerItem key={t.symbol} row={t} />
        ))}
      </SideList>
      <SideList title="Popular tickers">
        {data.popularTickers.map((t) => (
          <TickerItem key={t.symbol} row={t} />
        ))}
      </SideList>
      <SideList title="Your memberships" empty={data.signedIn ? undefined : "Sign in to see your memberships"}>
        {data.memberships.map((c) => (
          <CreatorItem key={c.handle} row={c} signedIn={data.signedIn} />
        ))}
        {data.signedIn ? membershipFill.map((c) => <CreatorItem key={`s-${c.handle}`} row={c} signedIn={data.signedIn} />) : null}
      </SideList>
      <SideList title="Following" empty={data.signedIn ? undefined : "Sign in to see who you follow"}>
        {data.following.map((c) => (
          <CreatorItem key={c.handle} row={c} signedIn={data.signedIn} />
        ))}
        {data.signedIn ? followingFill.map((c) => <CreatorItem key={`s-${c.handle}`} row={c} signedIn={data.signedIn} />) : null}
      </SideList>
      <YourTickers suggested={data.suggestedTickers} />
    </div>
  );
}

/**
 * Desktop: a column of the Today frame that scrolls on its own, starting
 * where the frame starts. Mobile: a drawer behind a control.
 */
export function TodaySidebar({ data }: { data: TodaySidebarPayload }) {
  return (
    <>
      <aside
        className={cn("hidden md:block md:w-[248px] md:shrink-0 md:pr-2", SCROLL_COLUMN)}
        aria-label="Today lists"
      >
        <TodaySidebarLists data={data} />
      </aside>
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className={cn(
              "focus-ring inline-flex w-max shrink-0 items-center gap-2 self-start rounded-[var(--radius-btn)] border border-border bg-surface px-3 py-1.5 text-[0.75rem] font-medium text-text md:hidden",
            )}
            aria-label="Open Today lists"
          >
            <PanelLeft size={14} strokeWidth={1.6} aria-hidden />
            Lists
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)] md:hidden" />
          <Dialog.Content
            className="fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] overflow-y-auto scroll-area border-r border-border bg-bg px-4 py-5 pl-[max(1rem,var(--safe-left))] pt-[max(1.25rem,var(--safe-top))] pb-[max(1.25rem,var(--safe-bottom))] md:hidden"
            aria-label="Today lists"
          >
            <div className="mb-5 flex items-center justify-between">
              <Dialog.Title className="num text-[11px] uppercase tracking-[0.2em] text-text-mute">Today</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" aria-label="Close" className="focus-ring rounded-[var(--radius-btn)] p-1 text-text-mute">
                  <X size={16} strokeWidth={1.6} aria-hidden />
                </button>
              </Dialog.Close>
            </div>
            <TodaySidebarLists data={data} />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
