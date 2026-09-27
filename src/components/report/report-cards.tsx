"use client";

import { cn } from "@/lib/design/cn";
import { FeedCardView } from "@/components/feed/feed-cards";
import type { FeedCard } from "@/lib/feed/types";

/**
 * One evidence card set inside the report body, beside the paragraph it
 * supports. The Feed shows the same card as a 9:16 stage; here it takes the
 * reading column's width and its own height, except the two kinds that draw
 * an image or a chart into whatever box they are given.
 *
 * A sealed card (locked, payload stripped on the server) scrolls the reader
 * to the locked section, which is where it can be opened.
 */
export function ReportCard({ card, ticker }: { card: FeedCard; ticker?: string | null }) {
  const drawn = card.kind === "figure" || card.kind === "chart";
  // A sealed card carries no content to give it height; hold a card's space.
  const sealed = card.kind !== "unlock" && card.kind !== "read" && card.locked;
  return (
    <div className={cn("report-card-slot", drawn && "h-[20rem]", sealed && "h-[11rem]")}>
      <FeedCardView
        card={card}
        ticker={ticker}
        onSealedTap={() =>
          document.getElementById("report-gate")?.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      />
    </div>
  );
}
