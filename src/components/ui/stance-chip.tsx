"use client";

import { cn } from "@/lib/design/cn";
import { useCartEnabled } from "@/components/interest-cart/gate";
import type { Direction } from "@/lib/types";

const chipBase =
  "inline-flex items-center gap-1 whitespace-nowrap rounded-chip border bg-surface px-2.5 py-0.5 text-ticker font-semibold leading-snug";

const stanceLabel: Record<Direction, string> = { long: "Long", short: "Short", hold: "Hold" };

/** Green and red mean direction while the Interest Cart is off. */
const stanceStyle: Record<Direction, string> = {
  long: "border-current text-gain",
  short: "border-current text-loss",
  hold: "border-border text-text-mute",
};

/** While it is on, the cart's animals are the only colour beside a ticker: the stance is ink. */
const stanceInk: Record<Direction, string> = {
  long: "border-border-strong text-text",
  short: "border-border-strong text-text",
  hold: "border-border text-text-mute",
};

const stanceGlyph: Record<Direction, string> = { long: "▲", short: "▼", hold: "" };

/** The declared stance on a publication. */
export function StanceChip({ direction, className }: { direction: Direction; className?: string }) {
  const cartOn = useCartEnabled();
  return (
    <span className={cn(chipBase, "border-[1.5px]", (cartOn ? stanceInk : stanceStyle)[direction], className)}>
      {stanceGlyph[direction] ? (
        <span aria-hidden className="text-[0.7em] leading-none">
          {stanceGlyph[direction]}
        </span>
      ) : null}
      {stanceLabel[direction]}
    </span>
  );
}
