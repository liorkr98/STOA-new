"use client";

import { createContext, useContext } from "react";
import type { FeedCard } from "@/lib/feed/types";

/**
 * The publication's deck, for cards the analyst placed inside the thesis.
 *
 * A placed card is stored in the body as its id alone. In Compose the id
 * resolves against the draft deck; on the published page there is no draft
 * deck, so without this every placed card read "Card no longer in the deck".
 * The report page hands the reader-safe deck (locked payloads already
 * stripped on the server) to the renderer, and the node view reads it here.
 * Null means "not the published reader".
 */
export const ReaderCardsContext = createContext<{
  cards: FeedCard[];
  ticker: string | null;
  onSealedTap?: () => void;
} | null>(null);

export function useReaderCards() {
  return useContext(ReaderCardsContext);
}
