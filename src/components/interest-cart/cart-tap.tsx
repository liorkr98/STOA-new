"use client";

import type { MouseEvent } from "react";
import { cn } from "@/lib/design/cn";
import { BearIcon, BullIcon } from "@/components/interest-cart/animals";
import { useInterestCart } from "@/components/interest-cart/cart-provider";
import type { CartDirection } from "@/lib/interest-cart/types";

/**
 * Bull and bear taps for one ticker. It always sits BESIDE the clickable
 * thing that shows the ticker (the chip, the row link, the card link), never
 * inside it: a button inside a link is invalid HTML and browsers repair it
 * unpredictably.
 *
 * A side already tapped this week keeps a quiet well behind it and shows its
 * count; the animals never change colour. No coral: this must not compete
 * with Follow or Subscribe. Each button is 32 x 28 and reaches 44 x 44 with
 * `.tap-target`; the 12px gap on a phone keeps the two hit areas from overlapping (a mouse needs no gap).
 *
 * On the Feed it lives in the stance card on the picture, where the chrome
 * passes touches through to the video: `className="pointer-events-auto"`.
 * It adds no scroller and sets no overscroll, so a vertical swipe that starts
 * on it still moves the Feed.
 */
export function CartTap({
  ticker,
  size = 18,
  className,
}: {
  ticker: string;
  /** 18 in rows, 16 over video, never under 14. */
  size?: number;
  className?: string;
}) {
  const { rowFor, tap } = useInterestCart();
  const row = rowFor(ticker);

  return (
    <span role="group" aria-label={`Your cart: ${ticker}`} className={cn("inline-flex shrink-0 items-center gap-3 md:gap-1", className)}>
      <Side ticker={ticker} side="bull" count={row?.bull ?? 0} size={size} onTap={tap} />
      <Side ticker={ticker} side="bear" count={row?.bear ?? 0} size={size} onTap={tap} />
    </span>
  );
}

function Side({
  ticker,
  side,
  count,
  size,
  onTap,
}: {
  ticker: string;
  side: CartDirection;
  count: number;
  size: number;
  onTap: (ticker: string, side: CartDirection) => void;
}) {
  const label = `Add a ${side} tap for ${ticker}${count > 0 ? `, ${count} this week` : ""}`;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e: MouseEvent) => {
        // A host card may listen for clicks; this tap is not one of them.
        e.stopPropagation();
        onTap(ticker, side);
      }}
      className={cn(
        "focus-ring tap-target inline-flex h-7 min-w-8 items-center justify-center gap-1 rounded-button px-1.5 transition-colors duration-[var(--dur-1)]",
        count > 0 ? "bg-surface-2" : "hover:bg-surface-2",
      )}
    >
      {side === "bull" ? <BullIcon size={size} /> : <BearIcon size={size} />}
      {count > 0 ? <span className="num text-ticker font-semibold leading-none text-text-mute">{count}</span> : null}
    </button>
  );
}
