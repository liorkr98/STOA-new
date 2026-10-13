import type { CartDirection } from "@/lib/interest-cart/types";

/**
 * A tap made while signed out. It is kept here, the person is sent to sign
 * up, and the tap is replayed once a session exists. It carries its tap id
 * from the moment it is held, so a replay that is interrupted (a reload
 * between the write and the clear) replays the same id and the store ignores
 * it the second time: one tap, counted once.
 */
export type HeldTap = {
  id: string;
  ticker: string;
  direction: CartDirection;
  heldAt: string;
};

const HELD_KEY = "stoa:cart:held";
/** A held tap older than this is dropped rather than replayed into a later week. */
const HELD_FOR_MS = 24 * 60 * 60 * 1000;

export function holdTap(ticker: string, direction: CartDirection): HeldTap {
  const held: HeldTap = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
    ticker,
    direction,
    heldAt: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(HELD_KEY, JSON.stringify(held));
  } catch {
    /* blocked storage: the tap is lost and sign-up still works */
  }
  return held;
}

export function readHeldTap(now: Date = new Date()): HeldTap | null {
  try {
    const raw = window.localStorage.getItem(HELD_KEY);
    if (!raw) return null;
    const held = JSON.parse(raw) as HeldTap;
    if (!held?.id || !held.ticker || (held.direction !== "bull" && held.direction !== "bear")) return null;
    if (now.getTime() - new Date(held.heldAt).getTime() > HELD_FOR_MS) {
      clearHeldTap(held.id);
      return null;
    }
    return held;
  } catch {
    return null;
  }
}

/** Clears the held tap, but only if it is still the one that was replayed. */
export function clearHeldTap(id: string): void {
  try {
    const raw = window.localStorage.getItem(HELD_KEY);
    if (raw && (JSON.parse(raw) as HeldTap).id === id) window.localStorage.removeItem(HELD_KEY);
  } catch {
    /* nothing to clear */
  }
}
