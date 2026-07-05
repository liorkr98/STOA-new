import type { JSONContent } from "@tiptap/core";
import type { NotebookEntry } from "@/lib/db/notebooks";

/**
 * Compose-from-notebook (Part F): turns notebook entries into a seeded Tiptap
 * doc -- snippets/notes as cited blockquotes, figures/KPIs as real
 * dataFigureNodes (source travels with them), charts as real chartNodes. The
 * analyst edits from there; research closes into publish.
 */

function text(t: string): JSONContent {
  return { type: "text", text: t };
}

function linkText(t: string, href: string): JSONContent {
  return { type: "text", text: t, marks: [{ type: "link", attrs: { href } }] };
}

function paragraph(content: JSONContent[]): JSONContent {
  return { type: "paragraph", content };
}

function citationLine(entry: NotebookEntry): JSONContent | null {
  const src = entry.source;
  if (!src) return null;
  const label = [src.title, src.ticker, src.asOf].filter(Boolean).join(" - ");
  if (!label && !src.url) return null;
  return paragraph([
    text("Source: "),
    src.url ? linkText(label || src.url, src.url) : text(label),
  ]);
}

function entryToNodes(entry: NotebookEntry): JSONContent[] {
  const p = entry.payload as Record<string, unknown>;

  if (entry.kind === "figure" || entry.kind === "kpi") {
    return [
      {
        type: "dataFigureNode",
        attrs: {
          label: String(p.label ?? ""),
          value: String(p.value ?? ""),
          note: String(p.note ?? ""),
          source: entry.source?.url ?? "",
          sourceRef: entry.source
            ? {
                kind: entry.source.accession ? "filing" : "manual",
                url: entry.source.url,
                accession: entry.source.accession,
                asOf: entry.source.asOf,
              }
            : null,
        },
      },
    ];
  }

  if (entry.kind === "chart") {
    return [
      {
        type: "chartNode",
        attrs: {
          ticker: String(p.ticker ?? entry.source?.ticker ?? ""),
          range: String(p.range ?? "3M"),
          kind: String(p.kind ?? "area"),
        },
      },
    ];
  }

  // snippet / note / report: a quoted passage with its citation.
  const quote = String(p.quote ?? p.text ?? "").trim();
  if (!quote) return [];
  const nodes: JSONContent[] = [
    { type: "blockquote", content: [paragraph([text(quote)])] },
  ];
  const cite = citationLine(entry);
  if (cite) nodes.push(cite);
  return nodes;
}

export function notebookToDoc(title: string, entries: NotebookEntry[]): JSONContent {
  const content: JSONContent[] = [
    { type: "heading", attrs: { level: 2 }, content: [text(`Notes: ${title}`)] },
  ];
  for (const entry of [...entries].reverse()) {
    content.push(...entryToNodes(entry));
  }
  content.push({ type: "paragraph" });
  return { type: "doc", content };
}
