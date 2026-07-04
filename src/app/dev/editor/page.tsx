import { StudioEditor } from "@/components/editor/studio-editor";
import type { Report } from "@/lib/types";

/**
 * Dev-only preview of the compose editor without the studio auth gate.
 * Seeds one of each Layer 3 financial node so they can be verified on load
 * (the slash menu needs a real keystroke the test harness can't send).
 */
const seedBody = JSON.stringify({
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Nvidia: data center thesis" }] },
    { type: "paragraph", content: [{ type: "text", text: "A quick look at the price action before the print." }] },
    { type: "chartNode", attrs: { ticker: "NVDA", range: "3M", kind: "area" } },
    { type: "chartNode", attrs: { nodeId: "cmp1", tickers: ["NVDA", "AMD", "INTC"], range: "1Y" } },
    {
      type: "dataFigureNode",
      attrs: { label: "Revenue TTM", value: "$96.3B", note: "+122% YoY", source: "https://example.com/10q" },
    },
    {
      type: "compareNode",
      attrs: {
        tickers: ["NVDA", "AMD", "INTC"],
        rows: [
          { label: "P/E", values: ["52", "44", "31"] },
          { label: "Rev growth", values: ["122%", "18%", "-1%"] },
        ],
      },
    },
    {
      type: "financialTableNode",
      attrs: {
        columns: ["Segment", "Revenue", "YoY"],
        rows: [["Data center", "$83.0B", "+217%"], ["Gaming", "$10.4B", "+15%"]],
        source: "Q3 FY25 10-Q",
      },
    },
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
