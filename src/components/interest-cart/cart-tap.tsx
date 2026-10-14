"use client";

import dynamic from "next/dynamic";
import { useInterestCart } from "@/components/interest-cart/gate";

export type CartTapProps = {
  ticker: string;
  /** 18 in rows, 16 over video, never under 14. */
  size?: number;
  className?: string;
};

const CartTapImpl = dynamic(() => import("@/components/interest-cart/cart-tap-impl"), { ssr: false });

/**
 * The reader's bull and bear for one ticker (cart-tap-impl.tsx). Renders
 * nothing, and loads nothing, unless the Interest Cart is on for this reader:
 * no element, no gap, no hidden control.
 */
export function CartTap(props: CartTapProps) {
  return useInterestCart() ? <CartTapImpl {...props} /> : null;
}
