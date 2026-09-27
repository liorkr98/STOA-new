"use client";

import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { followAnalyst } from "@/app/actions/social";
import * as Dialog from "@radix-ui/react-dialog";
import { PanelLeft, X } from "lucide-react";
import { DayChange } from "@/components/markets/day-change";
import { Avatar } from "@/components/ui/avatar";
import { TickerChip } from "@/components/ui/chip";
import { useInstrumentSheet } from "@/components/markets/instrument-sheet";
import { useWatchlist } from "@/lib/watchlist";
import { buttonClass } from "@/components/ui/button";
import { labelCase } from "@/lib/design/label";
import { cn } from "@/lib/design/cn";
import type { TodayCreatorRow, TodaySidebarPayload, TodayTicker, TodayTickerRow } from "@/lib/today/types";

/**
 * Today's rail: grouped lists that belong to the page. Text rows parted by
 * space, no rules, no solid buttons, no prices crowding a row; Follow is a
 * quiet "+ Follow" in coral text. Persistent beside the page on a desktop,
 * where it scrolls on its own; on a phone it is a drawer behind the Lists
 * control beside the dateline.
 *
 * One rule for Follow everywhere in it: a row shows "+ Follow" when the
 * reader does not follow it and nothing when they do. The absence of the
 * control is the signal. Memberships, Following and Your tickers are lists
 * of what the reader already has, so no row in them ever carries it.
 */

const RAIL_ROW = "flex min-h-11 min-w-0 items-center gap-2 py-1";
const FOLLOW =
  "focus-ring shrink-0 whitespace-nowrap rounded-chip py-1 pl-2 text-ticker font-semibold text-coral hover:underline disabled:opacity-50";

function SideList({ title, children, empty }: { title: string; children: ReactNode; empty?: string }) {
  const hasChildren = Array.isArray(children) ? children.flat().some(Boolean) : Boolean(children);
  return (
    <section aria-label={title}>
      <h3 className="text-body font-semibold text-text">{title}</h3>
      {hasChildren ? (
        <ul className="mt-1.5 flex flex-col">{children}</ul>
      ) : empty ? (
        <p className="mt-1.5 text-ticker text-text-mute">{empty}</p>
      ) : null}
    </section>
  );
}

/**
 * A creator the reader does not follow carries "+ Follow". On press the row
 * stays where it is and the control goes; the server confirms, and a
 * refusal brings it back with the reason. A follow is a follow, never a
 * toggle, so a stale row cannot unfollow.
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
    <li className={RAIL_ROW}>
      <Link
        href={`/analyst/${row.handle}`}
        className="focus-ring flex min-w-0 flex-1 items-center gap-2.5 rounded-chip text-body text-text hover:underline"
      >
        <Avatar src={row.avatarUrl} name={row.displayName} size={24} />
        <span className="truncate">{row.displayName}</span>
      </Link>
      {row.marker ? <span className="shrink-0 text-ticker text-text-mute">{labelCase(row.marker)}</span> : null}
      {!followed ? (
        <button type="button" onClick={follow} disabled={pending} aria-label={`Follow ${row.displayName}`} className={FOLLOW}>
          + Follow
        </button>
      ) : null}
    </li>
  );
}

/**
 * A ticker the reader does not follow carries "+ Follow". The watchlist is
 * the reader's browser plus, when signed in, the server table; once
 * followed the control goes and the row stays in place. The day change is
 * the one number a row keeps; the price is on the instrument sheet.
 */
function TickerItem({ row }: { row: TodayTickerRow }) {
  const sheet = useInstrumentSheet();
  const { ready, has, toggle } = useWatchlist();
  const showFollow = ready && !has(row.symbol);
  return (
    <li className={RAIL_ROW}>
      <button
        type="button"
        onClick={() => sheet?.open(row.symbol)}
        className="focus-ring min-w-0 shrink-0 rounded-chip"
        aria-label={`Open ${row.symbol}`}
      >
        <TickerChip ticker={row.symbol} className="hover:border-text" />
      </button>
      <DayChange percent={row.changePercent} className="ml-auto min-w-0" />
      {showFollow ? (
        <button type="button" onClick={() => toggle(row.symbol)} aria-label={`Follow ${row.symbol}`} className={FOLLOW}>
          + Follow
        </button>
      ) : null}
    </li>
  );
}

/**
 * YOUR TICKERS: exactly the reader's watchlist, one row per symbol, present
 * the moment a symbol is followed. Day changes come from the rows already on
 * the page when the symbol is in them, and from a fetch otherwise, so a row
 * never waits on the network to exist and the list never empties while it
 * loads.
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
    <div className="flex flex-col gap-8">
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

/** Desktop: a column of the frame that scrolls on its own, level with the nameplate. */
export function TodaySidebar({ data }: { data: TodaySidebarPayload }) {
  return (
    <aside className={cn("today-column hidden md:block md:w-[248px] md:shrink-0 md:pr-2 md:pt-4")} aria-label="Today lists">
      <TodaySidebarLists data={data} />
    </aside>
  );
}

/** Phone: the drawer, behind a control beside the dateline. */
export function TodayListsButton({ data }: { data: TodaySidebarPayload }) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className={buttonClass("ghost", "sm")}
          aria-label="Open Today lists"
        >
          <PanelLeft size={14} strokeWidth={1.8} aria-hidden />
          Lists
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[color-mix(in_srgb,var(--ink)_40%,transparent)] md:hidden" />
        <Dialog.Content
          className="scroll-area fixed inset-y-0 left-0 z-50 w-[300px] max-w-[85vw] overflow-y-auto border-r border-border bg-bg px-4 py-5 pl-[max(1rem,var(--safe-left))] pt-[max(1.25rem,var(--safe-top))] pb-[max(1.25rem,var(--safe-bottom))] md:hidden"
          aria-label="Today lists"
        >
          <div className="mb-5 flex items-center justify-between">
            <Dialog.Title className="t-title text-text">Lists</Dialog.Title>
            <Dialog.Close asChild>
              <button type="button" aria-label="Close" className={buttonClass("plain", "sm", "w-8 px-0")}>
                <X size={16} strokeWidth={1.8} aria-hidden />
              </button>
            </Dialog.Close>
          </div>
          <TodaySidebarLists data={data} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
