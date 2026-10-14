"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useSyncExternalStore } from "react";
import type { InterestCart } from "@/lib/interest-cart/cart";
import type { CartDirection, CartRow, CartWeek } from "@/lib/interest-cart/types";

/**
 * The Interest Cart's gate. Behind FEATURE_INTEREST_CART (src/lib/flags):
 * this file, and the few-line wrappers that ask it (CartTap, CartTrigger and
 * the surfaces that switch on `useCartEnabled`), are all of the cart that
 * ships to every reader. It asks the server once whether the cart exists for
 * this reader; until the answer is yes nothing else mounts, and the cart's
 * code (the runtime, the panel, the controls, the animals) is in separate
 * chunks the browser never fetches.
 * Delete the gate at launch and mount the runtime directly.
 */

/** What the running cart offers the controls, the nav mark and the panel. */
export type CartRuntime = {
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

type Snapshot = { enabled: boolean; runtime: CartRuntime | null };
let snapshot: Snapshot = { enabled: false, runtime: null };
const listeners = new Set<() => void>();

function publish(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** True once the server has said the cart exists for this reader. */
export function useCartEnabled(): boolean {
  return useSyncExternalStore(subscribe, () => snapshot.enabled, () => false);
}

/** The running cart, or null when the flag is off or it has not loaded. */
export function useInterestCart(): CartRuntime | null {
  return useSyncExternalStore(subscribe, () => snapshot.runtime, () => null);
}

/** Called by the runtime as its state changes, and with null as it unmounts. */
export function publishCartRuntime(runtime: CartRuntime | null) {
  publish({ runtime });
}

const CartRuntimeHost = dynamic(() => import("@/components/interest-cart/cart-runtime").then((m) => m.CartRuntimeHost), {
  ssr: false,
});

/** Mounted once in providers.tsx. */
export function InterestCartGate() {
  const enabled = useCartEnabled();
  const pathname = usePathname();
  // Off for everyone: asked once per page load and never again. On an
  // allowlist, asked again on navigation, so signing in picks it up.
  const recheck = useRef(true);

  useEffect(() => {
    if (!recheck.current) return;
    let alive = true;
    // Loaded here rather than at the top so rendering the gate (tests, the
    // server pass) never pulls in the server-only access check.
    void import("@/app/actions/interest-cart")
      .then(({ interestCartAccess }) => interestCartAccess())
      .then(({ open, recheck: again }) => {
        recheck.current = again;
        if (alive) publish(open ? { enabled: true } : { enabled: false, runtime: null });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [pathname]);

  return enabled ? <CartRuntimeHost /> : null;
}
