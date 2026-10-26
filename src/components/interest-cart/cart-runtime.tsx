"use client";

import "@/components/interest-cart/interest-cart.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createInterestCart, summariseWeek, type InterestCart } from "@/lib/interest-cart/cart";
import { CART_CHANGED_EVENT, cartStore } from "@/lib/interest-cart/store";
import { clearHeldTap, holdTap, readHeldTap, returnAfterTap } from "@/lib/interest-cart/held-tap";
import { readSessionUserId } from "@/lib/interest-cart/session";
import type { CartDirection, CartWeek } from "@/lib/interest-cart/types";
import { publishCartRuntime, type CartRuntime } from "@/components/interest-cart/gate";
import { CartPanel, PANEL_TOASTER } from "@/components/interest-cart/cart-panel";
import { weekKey, weekStartOf } from "@/lib/interest-cart/week";

/** Pages a held tap must not replay on: the person is still signing up. */
const AUTH_FLOW = ["/sign-in", "/sign-up", "/auth", "/onboarding", "/consent-required", "/forgot-password", "/reset-password"];

function added(cart: InterestCart, ticker: string) {
  // One toast per ticker, so a second tap replaces the first and Undo always
  // means the newest tap on that ticker, the one undoLastTap removes.
  toast("Added to your cart", {
    id: `cart-${ticker}`,
    action: { label: "Undo", onClick: () => void cart.undoLastTap(ticker) },
  });
}

/** A ticker taken out of the week on screen before the store has answered. */
export function without(week: CartWeek, ticker: string): CartWeek {
  const gone = week.rows.find((r) => r.ticker === ticker);
  if (!gone) return week;
  const rows = week.rows.filter((r) => r.ticker !== ticker);
  return { ...week, rows, tickers: rows.length, taps: week.taps - gone.total };
}

/** A tap counted on screen before the store has answered. */
function bump(week: CartWeek, ticker: string, direction: CartDirection): CartWeek {
  const rows = week.rows.some((r) => r.ticker === ticker)
    ? week.rows.map((r) => (r.ticker === ticker ? { ...r, [direction]: r[direction] + 1, total: r.total + 1 } : r))
    : [...week.rows, { ticker, bull: direction === "bull" ? 1 : 0, bear: direction === "bear" ? 1 : 0, total: 1 }];
  return { ...week, rows, tickers: rows.length, taps: week.taps + 1 };
}

/**
 * The running cart: session, this week's counts, the held-tap replay, taps
 * and the panel. Loaded only when the gate says the cart exists for this
 * reader (gate.tsx); it publishes its state there for the controls to read.
 */
export function CartRuntimeHost() {
  const router = useRouter();
  const pathname = usePathname();
  const [userId, setUserId] = useState<string | null>(null);
  const [thisWeek, setThisWeek] = useState<CartWeek | null>(null);
  const [isOpen, setOpen] = useState(false);
  const replaying = useRef(false);

  const cart = useMemo(() => (userId ? createInterestCart(cartStore(), userId) : null), [userId]);

  // The session is read on the device: the local adapter is keyed by it.
  useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Sign-up, sign-in and sign-out run on the server, which writes the session
  // cookie and redirects. The browser client hears nothing of that, so
  // onAuthStateChange never fires and the cart stayed signed out until a
  // reload. Reading the cookie again on every navigation picks it up.
  useEffect(() => {
    let alive = true;
    void readSessionUserId(createClient()).then((id) => {
      if (alive) setUserId(id);
    });
    return () => {
      alive = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!cart) return;
    let alive = true;
    const load = () =>
      void cart.getWeek(new Date()).then((w) => {
        if (alive) setThisWeek(w);
      });
    load();
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("stoa:cart:")) load();
    };
    // A tab left open over Sunday night shows the new week when it is looked at.
    const onVisible = () => {
      if (document.visibilityState === "visible") load();
    };
    window.addEventListener(CART_CHANGED_EVENT, load);
    window.addEventListener("storage", onStorage);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      window.removeEventListener(CART_CHANGED_EVENT, load);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cart]);

  // Replay a tap held while signed out, once the person is in and past the
  // sign-up pages. The tap keeps the id it was held under, so a second run
  // (a reload, a second tab, React running effects twice) is not counted.
  useEffect(() => {
    if (!cart || replaying.current) return;
    if (AUTH_FLOW.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    const held = readHeldTap();
    if (!held) return;
    replaying.current = true;
    void cart
      .addTap(held.ticker, held.direction, "site", { id: held.id })
      .then(({ inserted }) => {
        clearHeldTap(held.id);
        if (inserted) added(cart, held.ticker);
      })
      .catch(() => undefined)
      .finally(() => {
        replaying.current = false;
      });
  }, [cart, pathname]);

  const tap = useCallback(
    (ticker: string, direction: CartDirection) => {
      if (!cart) {
        holdTap(ticker, direction);
        const back = returnAfterTap(window.location.pathname, window.location.search, ticker);
        router.push(`/sign-up?next=${encodeURIComponent(back)}`);
        return;
      }
      setThisWeek((w) => bump(w ?? summariseWeek(weekKey(weekStartOf(new Date())), []), ticker, direction));
      void cart
        .addTap(ticker, direction, "site")
        .then(() => added(cart, ticker))
        .catch(() => toast.error("Could not add that to your cart. Try again."));
    },
    [cart, router],
  );

  const removeTicker = useCallback(
    (ticker: string) => {
      if (!cart) return;
      const symbol = ticker.toUpperCase();
      setThisWeek((w) => (w ? without(w, symbol) : w));
      // The tap toast's Undo would now find nothing to take back.
      toast.dismiss(`cart-${symbol}`);
      void cart
        .removeTicker(symbol)
        .then((done) => {
          if (!done) return;
          toast(`${symbol} removed from this week`, {
            id: `cart-remove-${symbol}`,
            // Removing happens in the open panel: its own toaster, so Undo is
            // clickable and reachable by keyboard there.
            toasterId: PANEL_TOASTER,
            action: { label: "Undo", onClick: () => void cart.restoreRemoval(done.removalId) },
          });
        })
        .catch(() => toast.error(`Could not remove ${symbol}. Try again.`));
    },
    [cart],
  );

  const rowFor = useCallback(
    (ticker: string) => thisWeek?.rows.find((r) => r.ticker === ticker.toUpperCase()) ?? null,
    [thisWeek],
  );

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<CartRuntime>(
    () => ({ cart, signedIn: Boolean(userId), thisWeek: cart ? thisWeek : null, rowFor, tap, removeTicker, isOpen, open, close }),
    [cart, userId, thisWeek, rowFor, tap, removeTicker, isOpen, open, close],
  );

  useEffect(() => {
    publishCartRuntime(value);
  }, [value]);
  useEffect(() => () => publishCartRuntime(null), []);

  return <CartPanel />;
}
