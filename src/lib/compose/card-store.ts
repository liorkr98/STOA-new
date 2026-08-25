"use client";

import { useSyncExternalStore } from "react";
import type { DraftCard } from "@/lib/compose/cards";

/**
 * The deck, readable from inside the Tiptap document.
 *
 * A card placed in the research body is stored as a node holding only the
 * card's id, so editing the card in the tray updates the figure in the prose
 * instead of leaving a stale copy behind. The node view is mounted by
 * ProseMirror rather than by the workspace's React tree, so it cannot be
 * reached by props; this is the same module-level channel the editor already
 * uses for the report ticker, with a subscription added so a card edit
 * repaints the figure.
 */

let deck: DraftCard[] = [];
const listeners = new Set<() => void>();

export function setComposeDeck(cards: DraftCard[]) {
  if (deck === cards) return;
  deck = cards;
  for (const l of listeners) l();
}

export function getComposeDeck(): DraftCard[] {
  return deck;
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Server render has no deck, so the figure falls back to its placeholder. */
const EMPTY: DraftCard[] = [];

export function useComposeDeck(): DraftCard[] {
  return useSyncExternalStore(subscribe, getComposeDeck, () => EMPTY);
}

export function useComposeCard(id: string): DraftCard | null {
  return useComposeDeck().find((c) => c.id === id) ?? null;
}
