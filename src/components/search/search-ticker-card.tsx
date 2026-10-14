"use client";

import Link from "next/link";
import { CartTap } from "@/components/interest-cart/cart-tap";
import { useCartEnabled } from "@/components/interest-cart/gate";

const CARD = "rounded-panel border border-border bg-surface px-4 py-3 transition-colors hover:border-border-strong";

/**
 * A ticker in the search results. The whole card is a link. While the
 * Interest Cart is on, the link is stretched over the card and the bull and
 * bear sit above it, beside the link rather than inside it; off, the card is
 * exactly the plain link it always was.
 */
export function SearchTickerCard({ ticker, name, sector }: { ticker: string; name: string; sector: string | null }) {
  const cartOn = useCartEnabled();
  const meta = (
    <div className="t-meta">
      {name}
      {sector ? ` · ${sector}` : ""}
    </div>
  );
  if (!cartOn) {
    return (
      <Link href={`/markets/${ticker}`} className={CARD}>
        <div className="num font-semibold">{ticker}</div>
        {meta}
      </Link>
    );
  }
  return (
    <div className={`relative ${CARD}`}>
      <div className="flex items-center justify-between gap-2">
        <Link href={`/markets/${ticker}`} className="num font-semibold after:absolute after:inset-0 after:rounded-panel focus-ring">
          {ticker}
        </Link>
        <CartTap ticker={ticker} className="relative z-10" />
      </div>
      {meta}
    </div>
  );
}
