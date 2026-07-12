import type { Editor } from "@tiptap/react";
import type { JSONContent } from "@tiptap/core";
import { applyTiptapTemplate } from "@/lib/editor/tiptap/templates";
import { tiptapPlainText } from "@/lib/editor/tiptap/serialize";

export function isDocMostlyEmpty(editor: Editor | null, json?: JSONContent): boolean {
  if (editor) {
    const text = editor.state.doc.textContent.trim();
    return text.length === 0 || (editor.state.doc.childCount <= 2 && text.length < 40);
  }
  if (json) {
    const text = tiptapPlainText(json).trim();
    return text.length === 0 || text.length < 40;
  }
  return true;
}

export async function fetchTemplatePeers(ticker?: string): Promise<string[]> {
  const t = ticker?.trim().toUpperCase();
  if (!t) return [];
  try {
    const res = await fetch(`/api/market/peers?ticker=${encodeURIComponent(t)}`);
    if (!res.ok) return [];
    const data = (await res.json()) as { peers?: string[] };
    return data.peers ?? [];
  } catch {
    return [];
  }
}

export function applyReportTemplateToEditor(
  editor: Editor,
  templateId: string,
  opts: { ticker?: string; peers?: string[]; mode?: "replace" | "append" } = {},
): boolean {
  const doc = applyTiptapTemplate(templateId, opts.ticker, opts.peers);
  if (!doc?.content?.length) return false;

  const mode = opts.mode ?? (isDocMostlyEmpty(editor) ? "replace" : "append");
  if (mode === "replace") {
    editor.chain().focus().setContent(doc).run();
  } else {
    editor.chain().focus().insertContent(doc.content as JSONContent[]).run();
  }
  return true;
}

export function applyReportTemplateToJson(
  templateId: string,
  current: JSONContent,
  opts: { ticker?: string; peers?: string[]; mode?: "replace" | "append" } = {},
): JSONContent | null {
  const doc = applyTiptapTemplate(templateId, opts.ticker, opts.peers);
  if (!doc) return null;
  const mode = opts.mode ?? (tiptapPlainText(current).trim().length < 40 ? "replace" : "append");
  if (mode === "replace") return doc;
  const merged = [...(current.content ?? []), ...(doc.content ?? [])];
  return { type: "doc", content: merged };
}
