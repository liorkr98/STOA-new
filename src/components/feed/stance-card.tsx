import { TickerChip } from "@/components/ui/chip";
import { cn } from "@/lib/design/cn";
import type { FeedPublication } from "@/lib/feed/types";
import type { Direction } from "@/lib/types";

const directionWord: Record<Direction, string> = { long: "Long", short: "Short", hold: "Hold" };
const directionGlyph: Record<Direction, string> = { long: "▲", short: "▼", hold: "" };
const directionTone: Record<Direction, string> = { long: "text-gain", short: "text-loss", hold: "text-text-mute" };

/**
 * What the publication is about, as a small paper card on the picture.
 *
 * A stance is a ticker and a direction: the ticker chip (the only mono on the
 * stage) and the direction word in the gain or loss tone. A ticker with no
 * direction names its sector beside it; a publication with no ticker shows
 * its theme or sector on its own. With none of those there is no card: an
 * empty card is never drawn.
 *
 * It is paper in both themes, opaque, and a card rather than a pill on purpose.
 * Clips carry their own trading-interface chips (translucent pills, coloured
 * words straight on the picture), and Stoa's own label must never be mistaken
 * for one of them, or one of them for it.
 */
export function StanceCard({ pub, className }: { pub: FeedPublication; className?: string }) {
  const subject = pub.ticker ? null : pub.themeTag ?? pub.sector;
  if (!pub.ticker && !subject) return null;
  const aside = pub.ticker && !pub.direction ? pub.sector : null;

  return (
    <div
      data-stance-card=""
      className={cn(
        "keep-paper inline-flex max-w-full items-center gap-2.5 rounded-panel bg-[color-mix(in_srgb,var(--surface)_95%,transparent)] py-1.5 pl-1.5 pr-3 text-text shadow-card",
        !pub.ticker && "pl-3",
        className,
      )}
    >
      {pub.ticker ? <TickerChip ticker={pub.ticker} className="border-border" /> : null}
      {pub.direction ? (
        <span className={cn("inline-flex items-center gap-1 text-body font-semibold leading-none", directionTone[pub.direction])}>
          {directionGlyph[pub.direction] ? (
            <span aria-hidden className="text-[0.7em]">
              {directionGlyph[pub.direction]}
            </span>
          ) : null}
          {directionWord[pub.direction]}
        </span>
      ) : null}
      {aside ? <span className="truncate text-ticker text-text-mute">{aside}</span> : null}
      {subject ? (
        <span dir="auto" className="user-copy truncate text-ticker font-semibold">
          {subject}
        </span>
      ) : null}
    </div>
  );
}
