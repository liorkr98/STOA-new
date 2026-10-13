"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { buttonClass } from "@/components/ui/button";
import { BearIcon, BullIcon } from "@/components/interest-cart/animals";
import { useInterestCart } from "@/components/interest-cart/cart-provider";
import { cartTickerInfo, type CartTickerInfo } from "@/app/actions/interest-cart";
import type { CartRow, CartWeek } from "@/lib/interest-cart/types";
import { RESET_DAY, addWeeks, parseWeekKey, weekBounds, weekKey, weekRangeLabel, weekStartOf } from "@/lib/interest-cart/week";

/** Compose owns the whole screen: no cart there. */
export function cartAllowedOn(pathname: string): boolean {
  return !pathname.startsWith("/studio/compose");
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The cart, as an overlay over whatever page the reader is on: a 420px
 * slide-over on the right on desktop, a full-height sheet on a phone. It is
 * not a route. Opening it pushes one history entry (`stoaCart`), the same
 * pattern as Today's stories, so the phone's back swipe and the browser's
 * Back close it and leave the page underneath exactly as it was.
 */
export function CartPanel() {
  const { isOpen, close } = useInterestCart();
  const pathname = usePathname();
  if (!isOpen || !cartAllowedOn(pathname)) return null;
  return <OpenPanel onClosed={close} />;
}

function OpenPanel({ onClosed }: { onClosed: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const openedOn = useRef(pathname);
  const goingTo = useRef<string | null>(null);

  useEffect(() => {
    if (!window.history.state?.stoaCart) {
      window.history.pushState({ ...window.history.state, stoaCart: true }, "");
    }
    const onPop = () => {
      onClosed();
      const href = goingTo.current;
      goingTo.current = null;
      if (href) router.push(href);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [onClosed, router]);

  // A route change that did not come through the panel (the tab bar under
  // a desktop panel, a sign-in redirect) closes it.
  useEffect(() => {
    if (pathname !== openedOn.current) onClosed();
  }, [pathname, onClosed]);

  const requestClose = useCallback(() => {
    if (window.history.state?.stoaCart) window.history.back();
    else onClosed();
  }, [onClosed]);

  /** Leave for another page: drop the panel's history entry first, so Back from there returns to the page under the cart. */
  const leaveTo = useCallback(
    (href: string) => (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      if (window.history.state?.stoaCart) {
        goingTo.current = href;
        window.history.back();
      } else {
        onClosed();
        router.push(href);
      }
    },
    [onClosed, router],
  );

  return (
    <Dialog.Root open onOpenChange={(open) => (open ? null : requestClose())}>
      <Dialog.Portal>
        <Dialog.Overlay className="cart-scrim fixed inset-0 z-[75] bg-[var(--ink)]/30" />
        <Dialog.Content
          aria-describedby="cart-deck"
          className="cart-panel fixed inset-0 z-[75] flex flex-col bg-paper outline-none md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:border-l md:border-border md:shadow-card"
        >
          <CartBody onClose={requestClose} leaveTo={leaveTo} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type LeaveTo = (href: string) => (e: MouseEvent<HTMLAnchorElement>) => void;

function CartBody({ onClose, leaveTo }: { onClose: () => void; leaveTo: LeaveTo }) {
  const { cart, signedIn, thisWeek } = useInterestCart();
  const currentKey = weekKey(weekStartOf(new Date()));
  const [shownKey, setShownKey] = useState(currentKey);
  const [week, setWeek] = useState<CartWeek | null>(null);
  const [weeks, setWeeks] = useState<string[]>([]);
  const [lastWeek, setLastWeek] = useState<CartWeek | null>(null);
  const [info, setInfo] = useState<Record<string, CartTickerInfo>>({});

  const isCurrent = shownKey === currentKey;
  const start = parseWeekKey(shownKey) ?? weekStartOf(new Date());

  // Reloads whenever this week's counts move (a tap elsewhere, an undo).
  useEffect(() => {
    if (!cart) return;
    let alive = true;
    void Promise.all([cart.getWeek(shownKey), cart.listWeeks()]).then(([w, list]) => {
      if (!alive) return;
      setWeek(w);
      setWeeks(list);
    });
    void cart.getWeek(weekKey(addWeeks(weekStartOf(new Date()), -1))).then((w) => {
      if (alive) setLastWeek(w);
    });
    return () => {
      alive = false;
    };
  }, [cart, shownKey, thisWeek]);

  const tickersKey = week?.rows.map((r) => r.ticker).join(",") ?? "";
  useEffect(() => {
    if (!tickersKey) return;
    let alive = true;
    const at = parseWeekKey(shownKey);
    if (!at) return;
    const { fromIso, toIso } = weekBounds(at);
    void cartTickerInfo(tickersKey.split(","), fromIso, toIso)
      .then((r) => {
        if (alive) setInfo((prev) => ({ ...prev, ...prefixed(shownKey, r) }));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [tickersKey, shownKey]);

  const earliest = weeks.length ? weeks[weeks.length - 1] : currentKey;
  const canGoBack = shownKey > earliest;

  return (
    <>
      <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-[calc(var(--safe-top)+1.25rem)] md:pt-6">
        <div className="min-w-0">
          <Dialog.Title className="t-headline">Cart</Dialog.Title>
          <Dialog.Description id="cart-deck" className="mt-1 text-body text-text-mute">
            The tickers that held your attention, week by week.
          </Dialog.Description>
        </div>
        <Dialog.Close asChild>
          <button
            type="button"
            aria-label="Close cart"
            className="focus-ring tap-target -mr-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-button text-text-mute hover:bg-surface-2 hover:text-text"
            onClick={(e) => {
              e.preventDefault();
              onClose();
            }}
          >
            <X size={20} />
          </button>
        </Dialog.Close>
      </header>

      {signedIn ? (
        <>
          <nav aria-label="Week" className="flex items-center justify-between gap-2 px-3">
            <button
              type="button"
              aria-label="Previous week"
              disabled={!canGoBack}
              onClick={() => setShownKey(weekKey(addWeeks(start, -1)))}
              className="focus-ring tap-target flex h-10 w-10 items-center justify-center rounded-button text-text hover:bg-surface-2 disabled:text-text-mute disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronLeft size={18} />
            </button>
            <p aria-live="polite" className="num text-body font-semibold text-text">
              {isCurrent ? "This week" : "Week of"} · {weekRangeLabel(start)}
            </p>
            <button
              type="button"
              aria-label="Next week"
              disabled={isCurrent}
              onClick={() => setShownKey(weekKey(addWeeks(start, 1)))}
              className="focus-ring tap-target flex h-10 w-10 items-center justify-center rounded-button text-text hover:bg-surface-2 disabled:text-text-mute disabled:opacity-40 disabled:hover:bg-transparent"
            >
              <ChevronRight size={18} />
            </button>
          </nav>

          <div className="scroll-area scroll-bare min-h-0 flex-1 overflow-y-auto px-5 pb-[calc(var(--safe-bottom)+2rem)]">
            {week && week.taps > 0 ? (
              <>
                <p className="num mt-3 text-ticker text-text-mute">
                  {plural(week.tickers, "ticker", "tickers")} · {plural(week.taps, "tap", "taps")}
                  {isCurrent ? ` · resets ${RESET_DAY}` : ""}
                </p>
                <ul className="mt-2 flex flex-col gap-3">
                  {week.rows.map((row) => (
                    <CartRowItem key={row.ticker} row={row} info={info[`${shownKey}:${row.ticker}`]} leaveTo={leaveTo} />
                  ))}
                </ul>
                <p className="mt-6 text-ticker text-text-mute">
                  Soon, taps you make while watching finance videos on YouTube will land here too.
                </p>
              </>
            ) : week ? (
              <EmptyWeek current={isCurrent} lastWeek={isCurrent ? lastWeek : null} leaveTo={leaveTo} />
            ) : null}
          </div>
        </>
      ) : (
        <SignedOut leaveTo={leaveTo} />
      )}
    </>
  );
}

function prefixed(weekKeyStr: string, r: Record<string, CartTickerInfo>): Record<string, CartTickerInfo> {
  return Object.fromEntries(Object.entries(r).map(([t, v]) => [`${weekKeyStr}:${t}`, v]));
}

/**
 * Layout C: the side that won drawn larger, the other beside it smaller and
 * quieter; a tie draws both at the same size. Never a net figure.
 */
function CartRowItem({ row, info, leaveTo }: { row: CartRow; info?: CartTickerInfo; leaveTo: LeaveTo }) {
  const tie = row.bull === row.bear;
  const lead = row.bull >= row.bear ? "bull" : "bear";
  const sides = (lead === "bull" ? ["bull", "bear"] : ["bear", "bull"]) as ("bull" | "bear")[];
  const move = info?.weekMovePct;
  const markets = `/markets/${encodeURIComponent(row.ticker)}`;

  return (
    <li className="py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="cart-ticker text-title text-text">{row.ticker}</span>
        <span className="flex items-center gap-3" aria-label={`${plural(row.bull, "bull tap", "bull taps")}, ${plural(row.bear, "bear tap", "bear taps")}`}>
          {sides.map((side, i) => {
            const big = tie || i === 0;
            const Icon = side === "bull" ? BullIcon : BearIcon;
            return (
              <span key={side} aria-hidden className={cn("inline-flex items-center gap-1.5", !big && "opacity-60")}>
                <Icon size={big ? 18 : 14} />
                <span className={cn("num font-semibold leading-none text-text", big ? "text-title" : "text-ticker")}>
                  {row[side]}
                </span>
              </span>
            );
          })}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-body text-text-mute">{info?.name ?? "\u00a0"}</span>
        <span className="num shrink-0 text-ticker text-text-mute">
          Price this week{" "}
          {move == null ? (
            <span>n/a</span>
          ) : (
            <span className={move >= 0 ? "text-[var(--up)]" : "text-[var(--down)]"}>
              {move >= 0 ? "+" : "−"}
              {Math.abs(move).toFixed(1)}%
            </span>
          )}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-ticker">
        <Link href={markets} onClick={leaveTo(markets)} className="focus-ring rounded-inner text-text underline-offset-2 hover:underline">
          {row.ticker} in Markets
        </Link>
        <Link
          href={`${markets}#coverage`}
          onClick={leaveTo(`${markets}#coverage`)}
          className="focus-ring rounded-inner text-text underline-offset-2 hover:underline"
        >
          Analysts covering {row.ticker}
        </Link>
      </div>
    </li>
  );
}

function EmptyWeek({ current, lastWeek, leaveTo }: { current: boolean; lastWeek: CartWeek | null; leaveTo: LeaveTo }) {
  if (!current) {
    return <p className="mt-8 text-body text-text-mute">No taps that week.</p>;
  }
  return (
    <div className="mt-8 rounded-panel bg-surface-2 p-5">
      <div aria-hidden className="flex items-center gap-2">
        <BullIcon size={28} />
        <BearIcon size={28} />
      </div>
      <h3 className="t-title mt-4">Nothing in your cart this week</h3>
      <p className="mt-2 text-body text-text-mute">
        When a ticker catches your eye, tap the bull or the bear beside it. You will find them next to
        tickers on the Feed, Today and Markets. Every tap lands here, so at the end of the week you can
        see what actually held your attention.
      </p>
      <p className="mt-2 text-body text-text-mute">The cart clears every {RESET_DAY}.</p>
      {lastWeek && lastWeek.tickers > 0 ? (
        <p className="num mt-2 text-body text-text">
          Last week had {plural(lastWeek.tickers, "ticker", "tickers")}.
        </p>
      ) : null}
      <Link href="/feed" onClick={leaveTo("/feed")} className={buttonClass("ink", "md", "mt-5")}>
        Open the Feed
      </Link>
    </div>
  );
}

function SignedOut({ leaveTo }: { leaveTo: LeaveTo }) {
  const [next] = useState(() =>
    typeof window === "undefined" ? "/feed" : `${window.location.pathname}${window.location.search}`,
  );
  const href = `/sign-up?next=${encodeURIComponent(next)}`;
  return (
    <div className="px-5 pb-[calc(var(--safe-bottom)+2rem)]">
      <div className="mt-4 rounded-panel bg-surface-2 p-5">
        <div aria-hidden className="flex items-center gap-2">
          <BullIcon size={28} />
          <BearIcon size={28} />
        </div>
        <h3 className="t-title mt-4">Keep a weekly cart of what caught your eye</h3>
        <p className="mt-2 text-body text-text-mute">
          Tap the bull or the bear beside any ticker on Stoa. Each tap is saved to your cart, and at
          the end of the week you can see what actually held your attention. It clears every {RESET_DAY}.
        </p>
        <Link href={href} onClick={leaveTo(href)} className={buttonClass("ink", "md", "mt-5")}>
          Join Stoa to start a cart
        </Link>
      </div>
    </div>
  );
}
