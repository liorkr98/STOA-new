"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createInterestCart, summariseWeek, type InterestCart } from "@/lib/interest-cart/cart";
import { CART_CHANGED_EVENT, cartStore } from "@/lib/interest-cart/store";
import { clearHeldTap, holdTap, readHeldTap } from "@/lib/interest-cart/held-tap";
import type { CartDirection, CartRow, CartWeek } from "@/lib/interest-cart/types";
import { weekKey, weekStartOf } from "@/lib/interest-cart/week";

/** Pages a held tap must not replay on: the person is still signing up. */
const AUTH_FLOW = ["/sign-in", "/sign-up", "/auth", "/onboarding", "/consent-required", "/forgot-password", "/reset-password"];

type CartContextValue = {
  /** Null while signed out (or before the session is read). */
  cart: InterestCart | null;
  signedIn: boolean;
  /** This week, for the nav badge and the tap controls. */
  thisWeek: CartWeek | null;
  rowFor: (ticker: string) => CartRow | null;
  tap: (ticker: string, direction: CartDirection) => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function useInterestCart(): CartContextValue {
  const value = useContext(CartContext);
  if (!value) throw new Error("useInterestCart needs <InterestCartProvider>");
  return value;
}

function added(cart: InterestCart, ticker: string) {
  // One toast per ticker, so a second tap replaces the first and Undo always
  // means the newest tap on that ticker, the one undoLastTap removes.
  toast("Added to your cart", {
    id: `cart-${ticker}`,
    action: { label: "Undo", onClick: () => void cart.undoLastTap(ticker) },
  });
}

/** A tap counted on screen before the store has answered. */
function bump(week: CartWeek, ticker: string, direction: CartDirection): CartWeek {
  const rows = week.rows.some((r) => r.ticker === ticker)
    ? week.rows.map((r) => (r.ticker === ticker ? { ...r, [direction]: r[direction] + 1, total: r.total + 1 } : r))
    : [...week.rows, { ticker, bull: direction === "bull" ? 1 : 0, bear: direction === "bear" ? 1 : 0, total: 1 }];
  return { ...week, rows, tickers: rows.length, taps: week.taps + 1 };
}

export function InterestCartProvider({ children }: { children: ReactNode }) {
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
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user.id ?? null);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

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
        const here = `${window.location.pathname}${window.location.search}`;
        router.push(`/sign-up?next=${encodeURIComponent(here)}`);
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

  const rowFor = useCallback(
    (ticker: string) => thisWeek?.rows.find((r) => r.ticker === ticker.toUpperCase()) ?? null,
    [thisWeek],
  );

  const open = useCallback(() => setOpen(true), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({ cart, signedIn: Boolean(userId), thisWeek: cart ? thisWeek : null, rowFor, tap, isOpen, open, close }),
    [cart, userId, thisWeek, rowFor, tap, isOpen, open, close],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
