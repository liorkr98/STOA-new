"use client";

import Link from "next/link";
import { DayChange } from "@/components/markets/day-change";
import { TickerChip } from "@/components/ui/chip";
import { CartTap } from "@/components/interest-cart/cart-tap";
import { useCartEnabled } from "@/components/interest-cart/gate";
import { price } from "@/lib/format";

/**
 * One peer on a stock page. The whole tile is a link. While the Interest
 * Cart is on, the bull and bear must sit beside that link, never inside it,
 * so the link is stretched over the tile instead and the taps are raised
 * above it; while it is off the tile is exactly the plain link it always was.
 */
export function PeerTile({
  symbol,
  name,
  lastPrice,
  publications,
}: {
  symbol: string;
  name: string;
  lastPrice: number | null;
  publications: number;
}) {
  const cartOn = useCartEnabled();
  const body = (
    <>
      <p className="mt-2 truncate text-ticker text-text">{name}</p>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="num text-ticker tabular-nums text-text">
          {lastPrice == null ? <span className="markets-pending">-</span> : price(lastPrice)}
        </span>
        <DayChange percent={null} />
      </div>
      <p className="markets-row-meta num mt-2">{publications} publications</p>
    </>
  );

  if (!cartOn) {
    return (
      <Link href={`/markets/${symbol}`} className="stock-peer focus-ring">
        <TickerChip ticker={symbol} />
        {body}
      </Link>
    );
  }
  return (
    <div className="stock-peer relative">
      <div className="flex items-center justify-between gap-2">
        <Link href={`/markets/${symbol}`} className="focus-ring rounded-chip after:absolute after:inset-0">
          <TickerChip ticker={symbol} />
        </Link>
        <CartTap ticker={symbol} className="relative z-10" />
      </div>
      {body}
    </div>
  );
}
