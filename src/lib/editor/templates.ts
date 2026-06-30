import { createBlock } from "@/lib/editor/document";
import type { EditorBlock } from "@/lib/editor/types";

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  type: "research" | "call";
  blocks: () => EditorBlock[];
}

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "earnings-recap",
    name: "Earnings recap",
    description: "Post-earnings: metrics, chart, bull/bear thesis",
    type: "research",
    blocks: () => [
      createBlock("heading"),
      { ...createBlock("heading"), content: { text: "Earnings snapshot" } },
      createBlock("metrics"),
      createBlock("chart"),
      createBlock("thesis"),
      createBlock("text"),
      createBlock("callout"),
    ],
  },
  {
    id: "deep-dive",
    name: "Deep dive",
    description: "Long-form thesis with structured sections",
    type: "research",
    blocks: () => [
      { ...createBlock("heading"), content: { text: "Investment thesis" } },
      createBlock("callout"),
      createBlock("text"),
      { ...createBlock("heading"), content: { text: "Business overview" } },
      createBlock("text"),
      createBlock("metrics"),
      { ...createBlock("heading"), content: { text: "Valuation" } },
      createBlock("chart"),
      createBlock("thesis"),
      { ...createBlock("heading"), content: { text: "Risks" } },
      createBlock("text"),
    ],
  },
  {
    id: "quick-call",
    name: "Quick call",
    description: "Short conviction call with chart",
    type: "call",
    blocks: () => [
      { ...createBlock("heading"), content: { text: "The trade" } },
      createBlock("callout"),
      createBlock("chart"),
      createBlock("text"),
    ],
  },
  {
    id: "sector-rotation",
    name: "Sector rotation",
    description: "Macro-aware sector view with metrics",
    type: "research",
    blocks: () => [
      { ...createBlock("heading"), content: { text: "Sector setup" } },
      createBlock("text"),
      createBlock("metrics"),
      createBlock("thesis"),
      createBlock("divider"),
      { ...createBlock("heading"), content: { text: "Top picks" } },
      createBlock("text"),
    ],
  },
  {
    id: "catalyst-note",
    name: "Catalyst note",
    description: "Event-driven setup before a catalyst",
    type: "call",
    blocks: () => [
      { ...createBlock("heading"), content: { text: "Catalyst" } },
      createBlock("callout"),
      createBlock("text"),
      createBlock("chart"),
      { ...createBlock("heading"), content: { text: "Positioning" } },
      createBlock("text"),
    ],
  },
];
