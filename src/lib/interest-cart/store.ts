import type { CartRemoval, CartTap } from "@/lib/interest-cart/types";
import { weekKeyOf } from "@/lib/interest-cart/week";

/**
 * Where taps live. Everything else in the cart talks to this interface and
 * nothing else, so moving to Supabase means writing one new adapter
 * (`interest_taps`, docs/backend/interest-cart.md) and swapping it in
 * `cartStore()`. No caller changes.
 */
export interface InterestCartStore {
  /** Adds a tap. A tap whose id is already stored is ignored, not counted twice. */
  insert(tap: CartTap): Promise<{ inserted: boolean }>;
  /**
   * Marks this person's newest counted tap on a ticker removed and returns it.
   * Soft: the tap is kept. Nothing in a store ever deletes a tap.
   */
  removeLatest(userId: string, ticker: string, removal: CartRemoval): Promise<CartTap | null>;
  /** Marks every counted tap on a ticker in [fromIso, toIso) removed, under one removal id. Returns how many. */
  removeTicker(userId: string, ticker: string, fromIso: string, toIso: string, removal: CartRemoval): Promise<number>;
  /** Counts again exactly the taps one removal took out. Returns how many. */
  restore(userId: string, removalId: string): Promise<number>;
  /** This person's counted (not removed) taps made in [fromIso, toIso). */
  listBetween(userId: string, fromIso: string, toIso: string): Promise<CartTap[]>;
  /** The keys of every week this person has a counted tap in, bucketed in their local time. */
  listWeekKeys(userId: string, weekStartsOn: number): Promise<string[]>;
}

/** Counted: made and not removed. */
export const isCounted = (t: CartTap) => !t.removedAt;

export const CART_CHANGED_EVENT = "stoa-cart-changed";
const KEY_PREFIX = "stoa:cart:v1:";

/**
 * TEMPORARY. Keeps taps in this browser's localStorage, keyed by user id,
 * until the `interest_taps` table exists. Taps made here do not follow the
 * person to another device and are not carried over to the table: it is a
 * stand-in so the cart can be built and used now. Delete it when the
 * Supabase adapter lands.
 */
export class TemporaryLocalCartStore implements InterestCartStore {
  private read(userId: string): CartTap[] {
    try {
      const raw = window.localStorage.getItem(KEY_PREFIX + userId);
      const parsed = raw ? (JSON.parse(raw) as CartTap[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private write(userId: string, taps: CartTap[]): void {
    try {
      window.localStorage.setItem(KEY_PREFIX + userId, JSON.stringify(taps));
    } catch {
      /* storage full or blocked: the tap is lost, as a failed insert would be */
    }
    window.dispatchEvent(new Event(CART_CHANGED_EVENT));
  }

  async insert(tap: CartTap): Promise<{ inserted: boolean }> {
    const taps = this.read(tap.userId);
    if (taps.some((t) => t.id === tap.id)) return { inserted: false };
    this.write(tap.userId, [...taps, tap]);
    return { inserted: true };
  }

  async removeLatest(userId: string, ticker: string, removal: CartRemoval): Promise<CartTap | null> {
    const taps = this.read(userId);
    let at = -1;
    taps.forEach((t, i) => {
      if (t.ticker === ticker && isCounted(t) && (at < 0 || t.createdAt >= taps[at].createdAt)) at = i;
    });
    if (at < 0) return null;
    taps[at] = { ...taps[at], ...marked(removal) };
    this.write(userId, taps);
    return taps[at];
  }

  async removeTicker(userId: string, ticker: string, fromIso: string, toIso: string, removal: CartRemoval): Promise<number> {
    let count = 0;
    const taps = this.read(userId).map((t) => {
      if (t.ticker !== ticker || !isCounted(t) || t.createdAt < fromIso || t.createdAt >= toIso) return t;
      count += 1;
      return { ...t, ...marked(removal) };
    });
    if (count > 0) this.write(userId, taps);
    return count;
  }

  async restore(userId: string, removalId: string): Promise<number> {
    let count = 0;
    const taps = this.read(userId).map((t) => {
      if (t.removalId !== removalId) return t;
      count += 1;
      return { ...t, removedAt: null, removalId: null, removedReason: null };
    });
    if (count > 0) this.write(userId, taps);
    return count;
  }

  async listBetween(userId: string, fromIso: string, toIso: string): Promise<CartTap[]> {
    return this.read(userId).filter((t) => isCounted(t) && t.createdAt >= fromIso && t.createdAt < toIso);
  }

  async listWeekKeys(userId: string, weekStartsOn: number): Promise<string[]> {
    const keys = new Set(this.read(userId).filter(isCounted).map((t) => weekKeyOf(new Date(t.createdAt), weekStartsOn)));
    return [...keys].sort().reverse();
  }
}

function marked(removal: CartRemoval): Pick<CartTap, "removedAt" | "removalId" | "removedReason"> {
  return { removedAt: removal.at.toISOString(), removalId: removal.id, removedReason: removal.reason };
}

let store: InterestCartStore | null = null;

/** The one store the app uses. The Supabase adapter replaces the line below. */
export function cartStore(): InterestCartStore {
  store ??= new TemporaryLocalCartStore();
  return store;
}
