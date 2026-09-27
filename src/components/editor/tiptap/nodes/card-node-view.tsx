"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/design/cn";
import { CardPreview } from "@/components/compose/card-preview";
import { useComposeCard } from "@/lib/compose/card-store";

/**
 * cardNode -- an evidence card sitting inline in the research body. It holds
 * only the id, so the figure here and the overlay on the video are the same
 * card: edit it once in the tray and both change. Removing the figure removes
 * the placement, never the card.
 */
export function CardNodeView({ node, deleteNode, selected, editor }: NodeViewProps) {
  const cardId = String(node.attrs.cardId ?? "");
  const card = useComposeCard(cardId);
  const isEditable = editor?.isEditable ?? true;

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
