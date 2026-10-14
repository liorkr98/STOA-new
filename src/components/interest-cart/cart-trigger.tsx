"use client";

import dynamic from "next/dynamic";
import { useInterestCart } from "@/components/interest-cart/gate";

const CartTriggerImpl = dynamic(() => import("@/components/interest-cart/cart-trigger-impl"), { ssr: false });

/** The cart's mark in the top nav (cart-trigger-impl.tsx); nothing unless the cart is on. */
export function CartTrigger({ className }: { className?: string }) {
  return useInterestCart() ? <CartTriggerImpl className={className} /> : null;
}
