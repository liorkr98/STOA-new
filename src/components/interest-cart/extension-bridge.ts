"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";
import type { InterestCart } from "@/lib/interest-cart/cart";
import { CART_CHANGED_EVENT } from "@/lib/interest-cart/store";
import type { BridgeRequest, ExtensionSessionPayload, HelloReply, PullReply } from "@/lib/extension/bridge-protocol";
import { extensionIds } from "@/lib/extension/id";

type PageRuntime = { sendMessage: (id: string, message: unknown) => Promise<unknown> };

/** Chrome gives a page `chrome.runtime` only when an installed extension lets that page talk to it. */
function pageRuntime(): PageRuntime | null {
  const rt = (window as unknown as { chrome?: { runtime?: Partial<PageRuntime> } }).chrome?.runtime;
  return typeof rt?.sendMessage === "function" ? (rt as PageRuntime) : null;
}

async function send<T>(message: BridgeRequest): Promise<T | null> {
  const rt = pageRuntime();
  if (!rt) return null;
  for (const id of extensionIds()) {
    try {
      const reply = (await rt.sendMessage(id, message)) as T | undefined;
      if (reply !== undefined) return reply;
    } catch {
      /* not installed under this id */
    }
  }
  return null;
}

/**
 * TEMPORARY, with the browser-kept cart. Links the Stoa extension to the
 * signed-in reader and carries its taps into the cart:
 *   1. the extension says who it is signed in as;
 *   2. if not this reader, the server makes the extension a session of its
 *      own (/api/extension/session) and the page passes it on;
 *   3. the taps Stoa's API accepted from the extension come over and go in
 *      through the same cart calls as a tap on the site, under their own ids
 *      (a second run cannot count them twice);
 *   4. the extension hears which arrived and this week's counts, for its card.
 * Runs on load, when the tab comes back into view, every 30 seconds while
 * Stoa is open, and after the cart changes. Steps 3 and 4 go when the
 * `interest_taps` table and its adapter exist; step 2 stays.
 */
export function useExtensionBridge(cart: InterestCart | null, userId: string | null) {
  const running = useRef(false);

  useEffect(() => {
    if (!cart || !userId || !pageRuntime()) return;
    let alive = true;
    let timer: number | null = null;

    const sync = async () => {
      if (running.current || !alive) return;
      running.current = true;
      try {
        const hello = await send<HelloReply>({ type: "stoa:hello" });
        if (!hello) return;
        if (hello.userId !== userId) {
          const res = await fetch("/api/extension/session", { method: "POST", credentials: "same-origin" });
          if (!res.ok) return;
          const session = (await res.json()) as ExtensionSessionPayload;
          if (session.userId !== userId) return;
          await send({ type: "stoa:session", session });
        }
        const pulled = await send<PullReply>({ type: "stoa:pull", userId });
        if (!pulled || !alive) return;
        const delivered: string[] = [];
        let added = 0;
        for (const t of pulled.taps) {
          const { inserted } = await cart.addTap(t.ticker, t.direction, "extension", {
            id: t.id,
            videoId: t.videoId,
            videoChannel: t.videoChannel,
            videoSeconds: t.videoSeconds,
            videoTitle: t.videoTitle ?? null,
            at: new Date(t.createdAt),
          });
          if (inserted) added += 1;
          delivered.push(t.id);
        }
        const undone: string[] = [];
        for (const u of pulled.undos) {
          await cart.undoLastTap(u.ticker);
          undone.push(u.id);
        }
        const week = await cart.getWeek(new Date());
        await send({
          type: "stoa:ack",
          userId,
          delivered,
          undone,
          week: { weekStart: week.weekStart, rows: week.rows.map(({ ticker, bull, bear }) => ({ ticker, bull, bear })) },
        });
        if (added > 0) toast(`${added} ${added === 1 ? "tap" : "taps"} from YouTube added to your cart`, { id: "cart-extension" });
      } catch {
        /* the next run tries again */
      } finally {
        running.current = false;
      }
    };

    const soon = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => void sync(), 400);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") soon();
    };
    soon();
    const every = window.setInterval(() => {
      if (document.visibilityState === "visible") void sync();
    }, 30_000);
    window.addEventListener(CART_CHANGED_EVENT, soon);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      alive = false;
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(every);
      window.removeEventListener(CART_CHANGED_EVENT, soon);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [cart, userId]);
}
