"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { CardPreview } from "@/components/compose/card-preview";
import { useComposeCard } from "@/lib/compose/card-store";
import { FeedCardView } from "@/components/feed/feed-cards";
import { useReaderCards } from "@/components/report/reader-cards";

/**
 * cardNode -- an evidence card sitting inline in the research body. It holds
 * only the id, so the figure here and the overlay on the video are the same
 * card: edit it once in the tray and both change. Removing the figure removes
 * the placement, never the card.
 */
export function CardNodeView({ node, deleteNode, selected, editor }: NodeViewProps) {
  const cardId = String(node.attrs.cardId ?? "");
  const card = useComposeCard(cardId);
  const reader = useReaderCards();
  const isEditable = editor?.isEditable ?? true;

  if (reader) {
    // A card the reader may not see is absent from the deck; say nothing
    // rather than claim it was removed.
    const placed = reader.cards.find((c) => c.id === cardId);
    if (!placed) return <NodeViewWrapper data-card-node="" className="hidden" />;
    return (
      <NodeViewWrapper data-card-node="" contentEditable={false} className="report-card-slot">
        <FeedCardView card={placed} ticker={reader.ticker} onSealedTap={reader.onSealedTap} />
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper
      data-card-node=""
      className={cn("my-4 rounded-panel", selected && "ring-2 ring-[var(--ink)]")}
    >
      {card ? (
        <figure className="relative">
          <CardPreview card={card} />
          {isEditable ? (
            <button
              type="button"
              onClick={deleteNode}
              aria-label="Remove this card from the research"
              className="focus-ring absolute right-2 top-2 rounded-[4px] border border-border bg-surface p-1 text-text-mute hover:text-[var(--error)]"
            >
              <Trash2 size={13} />
            </button>
          ) : null}
        </figure>
      ) : (
        <div className="rounded-panel border border-dashed border-border p-4">
          <p className="num text-ticker text-text-mute">
            Card no longer in the deck
          </p>
        </div>
      )}
    </NodeViewWrapper>
  );
}
