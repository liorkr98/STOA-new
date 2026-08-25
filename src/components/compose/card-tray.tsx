"use client";

import { useState } from "react";
import { GripVertical, Plus, Film, FileText, Lock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { CARD_DRAG_TYPE } from "@/lib/compose/drag";
import { cardInk, cardName, cardSummary, type CardUsage, type DraftCard } from "@/lib/compose/cards";
import { InkTag } from "@/components/feed/feed-cards";

/**
 * The card tray: the publication's deck, at the top of the toolbox rail.
 *
 * Cards live here rather than inside the video because they are neither the
 * video's nor the research's. A card stays in the tray after it is placed,
 * since the same card can appear in both, and each row says where it is
 * currently used so the creator never has to go looking.
 *
 * Dragging is the main gesture, and it is not the only one: a drag needs a
 * mouse, so every row also carries a Place menu that does the same thing from
 * a keyboard or a phone.
 */

function UsageMarks({ usage }: { usage: CardUsage }) {
  if (!usage.inVideo && !usage.inResearch) {
    return (
      <span className="num text-[10px] uppercase tracking-[0.12em] text-text-faint">Not placed</span>
    );
  }
  return (
    <span className="flex items-center gap-2">
      {usage.inVideo ? (
        <span className="num flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-text-mute">
          <Film size={10} aria-hidden /> Video
        </span>
      ) : null}
      {usage.inResearch ? (
        <span className="num flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-text-mute">
          <FileText size={10} aria-hidden /> Research
        </span>
      ) : null}
    </span>
  );
}

function TrayCard({
  card,
  usage,
  index,
  selected,
  onSelect,
  onReorder,
  onPlaceInVideo,
  onPlaceInResearch,
  canPlaceInVideo,
  canPlaceInResearch,
}: {
  card: DraftCard;
  usage: CardUsage;
  index: number;
  selected: boolean;
  onSelect: () => void;
  onReorder: (toIndex: number) => void;
  onPlaceInVideo: () => void;
  onPlaceInResearch: () => void;
  canPlaceInVideo: boolean;
  canPlaceInResearch: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [over, setOver] = useState(false);
  const pinned = card.kind === "unlock";

  return (
    <li
      draggable={!pinned}
      onDragStart={(e) => {
        e.dataTransfer.setData(CARD_DRAG_TYPE, card.id);
        e.dataTransfer.setData("text/plain", cardName(card));
        e.dataTransfer.effectAllowed = "copyMove";
      }}
      onDragOver={(e) => {
        if (pinned) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        setOver(false);
        const draggedId = e.dataTransfer.getData(CARD_DRAG_TYPE);
        if (!draggedId || draggedId === card.id) return;
        e.preventDefault();
        e.stopPropagation();
        onReorder(index);
      }}
      className={cn(
        "group relative rounded-[var(--radius-btn)] border transition-colors",
        selected ? "border-[var(--ink)] bg-surface-2" : "border-border bg-surface hover:border-border-strong",
        over && "border-[var(--brass)]",
      )}
    >
      <div className="flex items-start gap-1.5 p-2">
        <span
          aria-hidden
          className={cn("mt-0.5 shrink-0", pinned ? "text-text-faint" : "cursor-grab text-text-faint group-hover:text-text-mute")}
        >
          {pinned ? <Lock size={13} /> : <GripVertical size={13} />}
        </span>
        <button
          type="button"
          onClick={onSelect}
          className="focus-ring min-w-0 flex-1 rounded text-left"
        >
          <span className="flex items-baseline gap-1">
            <span className="truncate text-[0.8125rem] font-medium leading-snug text-text">{cardName(card)}</span>
            <InkTag ink={cardInk(card)} />
          </span>
          <span className="mt-0.5 block truncate text-[0.75rem] leading-snug text-text-mute">
            {cardSummary(card)}
          </span>
          <span className="mt-1 flex items-center gap-2">
            <UsageMarks usage={usage} />
            {card.locked ? (
              <span className="num flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-text-faint">
                <Lock size={10} aria-hidden /> Locked
              </span>
            ) : null}
          </span>
        </button>
        {pinned ? null : (
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={`Place ${cardName(card)}`}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
              className="focus-ring rounded p-1 text-text-faint hover:text-text"
            >
              <MoreHorizontal size={14} />
            </button>
            {menuOpen ? (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="menu-pop absolute right-0 top-7 z-20 w-44 rounded-[var(--radius-btn)] border border-border bg-surface p-1 shadow-[var(--shadow-card)]">
                  <button
                    type="button"
                    disabled={!canPlaceInVideo}
                    onClick={() => {
                      onPlaceInVideo();
                      setMenuOpen(false);
                    }}
                    className="focus-ring flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[0.8125rem] text-text hover:bg-surface-2 disabled:text-text-faint disabled:hover:bg-transparent"
                  >
                    <Film size={13} aria-hidden /> Place in video
                  </button>
                  <button
                    type="button"
                    disabled={!canPlaceInResearch}
                    onClick={() => {
                      onPlaceInResearch();
                      setMenuOpen(false);
                    }}
                    className="focus-ring flex w-full items-center gap-2 rounded-[4px] px-2 py-1.5 text-left text-[0.8125rem] text-text hover:bg-surface-2 disabled:text-text-faint disabled:hover:bg-transparent"
                  >
                    <FileText size={13} aria-hidden /> Insert in research
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </li>
  );
}

export function CardTray({
  cards,
  usage,
  selectedId,
  onSelect,
  onAdd,
  onReorder,
  onPlaceInVideo,
  onPlaceInResearch,
  hasVideo,
  hasResearch,
}: {
  cards: DraftCard[];
  usage: Map<string, CardUsage>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onAdd: () => void;
  onReorder: (cardId: string, toIndex: number) => void;
  onPlaceInVideo: (cardId: string) => void;
  onPlaceInResearch: (cardId: string) => void;
  hasVideo: boolean;
  hasResearch: boolean;
}) {
  const [dragged, setDragged] = useState<string | null>(null);
  const count = cards.filter((c) => c.kind !== "unlock").length;

  return (
    <section aria-label="Cards" className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="t-eyebrow">Cards</h2>
        <span className="num text-[10px] uppercase tracking-[0.14em] text-text-faint">
          {count === 0 ? "None yet" : `${count} in the deck`}
        </span>
      </div>

      {cards.length === 0 ? (
        <p className="mt-2 text-[0.8125rem] leading-snug text-text-mute">
          Cards are your evidence. Build them once and use them in the video, in the research, or in both.
        </p>
      ) : (
        <ul
          className="mt-2 space-y-1.5"
          onDragStart={(e) => setDragged((e.target as HTMLElement).getAttribute("data-card-id"))}
          onDragEnd={() => setDragged(null)}
        >
          {cards.map((card, i) => (
            <div key={card.id} data-card-id={card.id}>
              <TrayCard
                card={card}
                index={i}
                usage={usage.get(card.id) ?? { inVideo: false, inResearch: false }}
                selected={selectedId === card.id}
                onSelect={() => onSelect(selectedId === card.id ? null : card.id)}
                onReorder={(to) => {
                  if (dragged) onReorder(dragged, to);
                }}
                onPlaceInVideo={() => onPlaceInVideo(card.id)}
                onPlaceInResearch={() => onPlaceInResearch(card.id)}
                canPlaceInVideo={hasVideo}
                canPlaceInResearch={hasResearch}
              />
            </div>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={onAdd}
        className="focus-ring mt-2 flex w-full items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-dashed border-border px-3 py-2 text-[0.8125rem] text-text-mute transition-colors hover:border-[var(--ink)] hover:text-text"
      >
        <Plus size={14} aria-hidden /> Add a card
      </button>
    </section>
  );
}
