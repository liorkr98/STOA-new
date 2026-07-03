import type { JSONContent } from "@tiptap/core";

/**
 * reports.body carries three historical shapes, discriminated on read:
 *   1. plain text        -- oldest reports
 *   2. legacy block JSON  -- {"version":1,"blocks":[...]} (custom editor)
 *   3. Tiptap JSON        -- {"type":"doc",...} (this editor)
 * isTiptapDoc picks (3) out so the reading view routes each to the right
 * renderer and no existing report breaks.
 */
export function isTiptapDoc(body: string | null | undefined): boolean {
  if (!body) return false;
  const t = body.trimStart();
  if (!t.startsWith("{")) return false;
  return /"type"\s*:\s*"doc"/.test(t);
}

export function emptyTiptapDoc(): JSONContent {
  return {
    type: "doc",
    content: [
      { type: "heading", attrs: { level: 2 } },
      { type: "paragraph" },
    ],
  };
}

/** Parse stored body to a Tiptap doc, or an empty doc if it is not one. */
export function parseTiptapDoc(body: string | null | undefined): JSONContent {
  if (!isTiptapDoc(body)) return emptyTiptapDoc();
  try {
    return JSON.parse(body as string) as JSONContent;
  } catch {
    return emptyTiptapDoc();
  }
}

const BLOCK_TYPES = new Set([
  "paragraph",
  "heading",
  "blockquote",
  "callout",
  "listItem",
  "horizontalRule",
]);

/**
 * Flatten a Tiptap doc to plain text for the summary fallback, the
 * fact-check pass, and the publish payload. Not a renderer -- just the
 * words, block-separated.
 */
export function tiptapPlainText(json: JSONContent | null | undefined): string {
  if (!json) return "";
  const out: string[] = [];
  const walk = (n: JSONContent) => {
    if (n.type === "text") {
      out.push(n.text ?? "");
      return;
    }
    (n.content ?? []).forEach(walk);
    if (n.type && BLOCK_TYPES.has(n.type)) out.push("\n\n");
  };
  walk(json);
  return out.join("").replace(/\n{3,}/g, "\n\n").trim();
}

/** True when the doc has no real text and no financial node worth saving. */
export function isTiptapDocEmpty(json: JSONContent | null | undefined): boolean {
  if (!json?.content?.length) return true;
  if (tiptapPlainText(json).trim()) return false;
  // A doc can be "non-empty" purely from a financial node (chart, figure...).
  const hasNode = (n: JSONContent): boolean => {
    if (n.type && n.type.endsWith("Node")) return true;
    return (n.content ?? []).some(hasNode);
  };
  return !hasNode(json);
}
