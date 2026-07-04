import { TiptapReportRenderer } from "@/components/editor/tiptap/report-renderer";
import type { JSONContent } from "@tiptap/core";

/**
 * Dev-only: the read-only renderer (investor view) with two chartNodes --
 * one that has a captured screenshot (renders the PNG), one without (falls
 * back to the live chart, which shows "Chart unavailable" when unauthed).
 */
const doc: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Reading view: chart with screenshot" }] },
    {
      type: "chartNode",
      attrs: {
        nodeId: "seed1",
        ticker: "NVDA",
        range: "3M",
        kind: "area",
        screenshotUrl: "https://placehold.co/800x260/eff1ed/2f6e5d/png?text=NVDA+chart",
      },
    },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Reading view: no screenshot (live fallback)" }] },
    {
      type: "chartNode",
      attrs: { nodeId: "seed2", ticker: "AMD", range: "1Y", kind: "line", screenshotUrl: null },
    },
    { type: "paragraph" },
  ],
};

export default function ChartReadPreview() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-10">
      <TiptapReportRenderer json={doc} />
    </div>
  );
}
