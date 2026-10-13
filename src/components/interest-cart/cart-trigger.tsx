"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/design/cn";
import { CartMark } from "@/components/interest-cart/animals";
import { useInterestCart } from "@/components/interest-cart/cart-provider";
import { cartAllowedOn } from "@/components/interest-cart/cart-panel";

/**
 * The cart's place in the top nav, on every page but Compose. The bull and
 * bear pair, grey when the week is empty, with this week's tap count on an
 * ink badge. A count, never a sign: no plus, no minus.
 */
export function CartTrigger({ className }: { className?: string }) {
  const { thisWeek, open } = useInterestCart();
  const pathname = usePathname();
  if (!cartAllowedOn(pathname)) return null;
  const taps = thisWeek?.taps ?? 0;
  return (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-label={taps > 0 ? `Your cart, ${taps} ${taps === 1 ? "tap" : "taps"} this week` : "Your cart"}
      className={cn(
        "focus-ring relative flex h-10 w-11 shrink-0 items-center justify-center rounded-button hover:bg-surface-2",
        className,
      )}
    >
      <span className="relative flex">
        <CartMark muted={taps === 0} />
        {taps > 0 ? (
        <span
          aria-hidden
          className="num absolute -right-4 -top-3 flex h-[18px] min-w-[18px] items-center justify-center rounded-chip bg-[var(--ink)] px-1 text-ticker font-semibold leading-none text-paper ring-2 ring-[var(--paper)]"
        >
          {taps > 99 ? "99" : taps}
        </span>
        ) : null}
      </span>
    </button>
  );
}
