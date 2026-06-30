import { nanoid } from "nanoid";
import type { BlockType, EditorBlock, ReportDocument } from "./types";

export function createBlock(type: BlockType): EditorBlock {
  const id = nanoid(10);
  switch (type) {
    case "heading":
      return { id, type, content: { text: "Section title" } };
    case "text":
      return { id, type, content: { text: "" } };
    case "callout":
      return { id, type, content: { text: "Key insight goes here.", tone: "accent" } };
    case "chart":
      return { id, type, content: { ticker: "NVDA", caption: "Price action" } };
    case "thesis":
      return { id, type, content: { bull: "Bull case...", bear: "Bear case..." } };
    case "metrics":
      return {
        id,
        type,
        content: {
          items: "Revenue growth|+24%|Market cap|$2.1T|P/E|34|Margin|28%",
        },
      };
    case "divider":
      return { id, type, content: {} };
    default:
      return { id, type: "text", content: { text: "" } };
  }
}

export function emptyDocument(): ReportDocument {
  return {
    version: 1,
    blocks: [createBlock("heading"), createBlock("text")],
  };
}

export function parseDocument(body: string | null | undefined): ReportDocument {
  if (!body?.trim()) return emptyDocument();
  try {
    const parsed = JSON.parse(body) as ReportDocument;
    if (parsed?.version === 1 && Array.isArray(parsed.blocks)) return parsed;
  } catch {
    // Legacy plain text
  }
  return {
    version: 1,
    blocks: [
      createBlock("heading"),
      { ...createBlock("text"), content: { text: body } },
    ],
  };
}

export function serializeDocument(doc: ReportDocument): string {
  return JSON.stringify(doc);
}

export function documentPlainText(doc: ReportDocument): string {
  return doc.blocks
    .map((b) => {
      if (b.type === "heading" || b.type === "text" || b.type === "callout") {
        return String(b.content.text ?? "");
      }
      if (b.type === "thesis") {
        return `${b.content.bull ?? ""}\n${b.content.bear ?? ""}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("\n\n");
}

export function parseMetricsItems(raw: string | undefined): { label: string; value: string }[] {
  if (!raw) return [];
  return raw.split("|").reduce<{ label: string; value: string }[]>((acc, part, i, arr) => {
    if (i % 2 === 0 && arr[i + 1]) acc.push({ label: part, value: arr[i + 1] });
    return acc;
  }, []);
}

export function metricsToRaw(items: { label: string; value: string }[]): string {
  return items.flatMap((i) => [i.label, i.value]).join("|");
}
