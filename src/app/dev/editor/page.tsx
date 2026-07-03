import { StudioEditor } from "@/components/editor/studio-editor";
import type { Report } from "@/lib/types";

/**
 * Dev-only preview of the compose editor without the studio auth gate.
 * Seeds a chartNode so the Layer 3 financial nodes can be verified on load
 * (the slash menu needs a real keystroke the test harness can't send).
 */
const seedBody = JSON.stringify({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Nvidia: data center thesis" }] },
    { type: "paragraph", content: [{ type: "text", text: "A quick look at the price action before the print." }] },
    { type: "chartNode", attrs: { ticker: "NVDA", range: "3M", kind: "area" } },
    { type: "paragraph" },
  ],
});

const seedDraft = {
  id: "dev-seed",
  type: "research",
  title: "Nvidia: data center thesis",
  summary: "Preview draft for the Tiptap editor and financial nodes.",
  body: seedBody,
  access: "free",
  ticker: "NVDA",
} as unknown as Report;

export default function EditorPreviewPage() {
  return <StudioEditor analystReportPrice={12} initialDraft={seedDraft} aiCredits={40} />;
}
