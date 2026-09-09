"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { followAnalyst } from "@/app/actions/social";
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
 * Analysts are an avatar and a name only.
 *
 * One rule for Follow everywhere in it: a row shows Follow when the reader
 * does not follow it and nothing when they do. The absence of the button is
 * the signal. Memberships, Following and Your tickers are lists of what the
 * reader already has, so no row in them ever carries the control, and none of
 * them is padded with suggestions dressed as entries.
 */

function SideList({ title, children, empty }: { title: string; children: ReactNode; empty?: string }) {
  const hasChildren = Array.isArray(children) ? children.flat().some(Boolean) : Boolean(children);
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
  "num tap-target focus-ring inline-flex shrink-0 items-center rounded-[var(--radius-tag)] border border-[var(--ink)] bg-[var(--ink)] px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-[var(--paper)] transition-[filter] duration-[var(--dur-1)] hover:brightness-[1.06]";

/**
 * A creator the reader does not follow carries a solid Follow control.
 * On press the row stays exactly where it is and the button goes;
 * the server confirms, and a refusal brings the button back with the reason.
 * The follow is a follow, never a toggle, so a stale row cannot unfollow.
 */
function CreatorItem({ row, signedIn }: { row: TodayCreatorRow; signedIn: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // The optimistic answer, remembered against the prop it overrode, so a
  // refreshed payload that already agrees takes over without an effect.
  const [local, setLocal] = useState<{ over: boolean; value: boolean } | null>(null);
  const followed = local && local.over === row.followed ? local.value : row.followed;

  const follow = () => {
    if (!signedIn) {
      router.push("/sign-in?next=/home");
      return;
    }
    setLocal({ over: row.followed, value: true });
    start(async () => {
      try {
        const res = await followAnalyst(row.id);
        if ("error" in res) throw new Error(res.error);
      } catch (e) {
        setLocal(null);
        toast.error(e instanceof Error ? e.message : "That follow did not stick. Try again.");
      }
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
      {!followed ? (
        <button type="button" onClick={follow} disabled={pending} aria-label={`Follow ${row.displayName}`} className={quietPill}>
          Follow
        </button>
      ) : null}
    </li>
  );
}

/**
 * A ticker the reader does not follow carries the outlined Follow control.
 * The watchlist is the reader's browser plus, when signed in, the server
 * table; once followed the button goes and the row stays in place.
 */
function TickerItem({ row }: { row: TodayTickerRow }) {
  const sheet = useInstrumentSheet();
  const { ready, has } = useWatchlist();
  const showFollow = ready && !has(row.symbol);
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

/**
 * YOUR TICKERS: exactly the reader's watchlist, one row per symbol, present
 * the moment a symbol is followed. Prices come from the rows already on the
 * page when the symbol is in them, and from a fetch otherwise, so a row never
 * waits on the network to exist and the list never empties while it loads.
 */
function YourTickers({ known, signedIn }: { known: Map<string, TodayTickerRow>; signedIn: boolean }) {
  const { tickers, ready } = useWatchlist();
  const shown = tickers.slice(0, 12);
  const key = shown.join(",");
  const [fetched, setFetched] = useState<Map<string, TodayTickerRow>>(() => new Map());

  useEffect(() => {
    const missing = key ? key.split(",").filter((s) => !known.has(s)) : [];
    if (missing.length === 0) return;
    let live = true;
    fetch(`/api/today/tickers?symbols=${encodeURIComponent(missing.join(","))}`)
      .then((r) => (r.ok ? r.json() : { tickers: [] }))
      .then((data: { tickers: TodayTicker[] }) => {
        if (!live) return;
        setFetched((prev) => {
          const next = new Map(prev);
          for (const t of data.tickers ?? []) {
            next.set(t.symbol, {
              symbol: t.symbol,
              price: t.price,
              changePercent: t.changePercent ?? null,
              publications: t.publicationsToday,
            });
          }
          return next;
        });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [key, known]);

  if (!ready) return <SideList title="Your tickers">{null}</SideList>;
  const rows = shown.map(
    (symbol) => known.get(symbol) ?? fetched.get(symbol) ?? { symbol, price: null, changePercent: null, publications: 0 },
  );
  return (
    <SideList title="Your tickers" empty={signedIn ? "Follow a ticker from the lists above" : "Sign in to keep a list of tickers"}>
      {rows.map((r) => (
        <TickerItem key={r.symbol} row={r} />
      ))}
    </SideList>
  );
}

export function TodaySidebarLists({ data }: { data: TodaySidebarPayload }) {
  const known = useMemo(
    () => new Map([...data.trendingTickers, ...data.popularTickers].map((t) => [t.symbol, t] as const)),
    [data.trendingTickers, data.popularTickers],
  );

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
      <SideList title="Your memberships" empty={data.signedIn ? "No memberships yet" : "Sign in to see your memberships"}>
        {data.memberships.map((c) => (
          <CreatorItem key={c.handle} row={c} signedIn={data.signedIn} />
        ))}
      </SideList>
      <SideList title="Following" empty={data.signedIn ? "Follow a creator from the lists above" : "Sign in to see who you follow"}>
        {data.following.map((c) => (
          <CreatorItem key={c.handle} row={c} signedIn={data.signedIn} />
        ))}
      </SideList>
      <YourTickers known={known} signedIn={data.signedIn} />
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
