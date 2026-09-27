import type { JSONContent } from "@tiptap/core";
import { isTiptapDoc, parseTiptapDoc, tiptapPlainText } from "@/lib/editor/tiptap/serialize";
import { estimateReadMinutes } from "@/lib/dispatch/ranking";
import type { FeedCard } from "@/lib/feed/types";

/**
 * The words of a stored body, whatever shape it was saved in (plain text,
 * legacy block JSON or Tiptap JSON). For counting, never for rendering.
 */
export function bodyWords(body: string | null | undefined): string {
  const raw = body?.trim();
  if (!raw) return "";
  if (isTiptapDoc(raw)) return tiptapPlainText(parseTiptapDoc(raw));
  if (!raw.startsWith("{")) return raw;
  try {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === "string") out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk((JSON.parse(raw) as { blocks?: unknown }).blocks);
    return out.join(" ");
  } catch {
    return "";
  }
}

/** Minutes to read a body, or null when there is nothing to read. */
export function readMinutes(body: string | null | undefined): number | null {
  const words = bodyWords(body);
  return words ? estimateReadMinutes([words]) : null;
}

/** A plain-text body as paragraphs: blank lines separate them. */
export function plainParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/** Ids of the cards the analyst placed inside a Tiptap body. */
export function placedCardIds(json: JSONContent): Set<string> {
  const ids = new Set<string>();
  const walk = (n: JSONContent) => {
    if (n.type === "cardNode" && typeof n.attrs?.cardId === "string") ids.add(n.attrs.cardId);
    (n.content ?? []).forEach(walk);
  };
  walk(json);
  return ids;
}

export type ReadingPiece =
  | { kind: "paragraph"; text: string }
  | { kind: "card"; card: FeedCard };

/**
 * A plain-text body with its evidence cards set between the paragraphs, so a
 * card sits beside the argument it supports instead of in a strip above it.
 * Plain text carries no placement, so the order is the deck's own: the text
 * leads for two paragraphs, then one card follows each paragraph, and any
 * cards left over close the body.
 */
export function interleaveCards(paragraphs: string[], cards: FeedCard[]): ReadingPiece[] {
  const out: ReadingPiece[] = [];
  let next = 0;
  paragraphs.forEach((text, i) => {
    out.push({ kind: "paragraph", text });
    if (i >= 1 && next < cards.length) out.push({ kind: "card", card: cards[next++]! });
  });
  while (next < cards.length) out.push({ kind: "card", card: cards[next++]! });
  return out;
}
