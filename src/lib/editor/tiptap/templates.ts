import type { JSONContent } from "@tiptap/core";

export interface TiptapReportTemplate {
  id: string;
  name: string;
  description: string;
  /** Build a full TipTap doc for the ticker (optional peer symbols for comps). */
  build: (ticker?: string, peers?: string[]) => JSONContent;
}

function h2(text: string): JSONContent {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function h3(text: string): JSONContent {
  return { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] };
}

function p(text: string): JSONContent {
  return {
    type: "paragraph",
    content: text ? [{ type: "text", text }] : [],
  };
}

function callout(text: string): JSONContent {
  return { type: "callout", content: [{ type: "text", text }] };
}

function divider(): JSONContent {
  return { type: "horizontalRule" };
}

/**
 * Initiating-coverage scaffold inspired by institutional equity research
 * structure (company → industry → financials → valuation → risks → catalysts).
 * Analyst fills the blanks; live blocks are pre-wired to the ticker.
 */
function initiatingCoverage(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const symbols =
    t === "TICKER"
      ? []
      : [t, ...peers.map((p) => p.toUpperCase()).filter((p) => p && p !== t)].slice(0, 4);
  return {
    type: "doc",
    content: [
      callout(
        `Draft scaffold for ${t}. Replace every placeholder with your own analysis. Locked call fields stay in the right panel.`,
      ),
      h2("1. Company overview"),
      p(`What ${t} does, how it makes money, and where it sits in its value chain.`),
      h3("History and positioning"),
      p(""),
      h3("Products and segments"),
      p(""),
      h3("Management"),
      p(""),
      divider(),
      h2("2. Industry and competition"),
      p("TAM, growth drivers, competitive intensity, and switching costs."),
      h3("Competitive set"),
      p(""),
      {
        type: "comparisonNode",
        attrs: { symbols, metric: "revenue", years: 5, kind: "line" },
      },
      ...(symbols.length >= 2
        ? [
            {
              type: "compareNode",
              attrs: {
                tickers: symbols,
                rows: [
                  { label: "P/E", values: symbols.map(() => "") },
                  { label: "Rev growth", values: symbols.map(() => "") },
                  { label: "Gross margin", values: symbols.map(() => "") },
                ],
              },
            } as JSONContent,
          ]
        : []),
      divider(),
      h2("3. Financials"),
      p("Revenue quality, margins, cash conversion, and balance-sheet flexibility."),
      {
        type: "statementNode",
        attrs: { ticker: t === "TICKER" ? "" : t, kind: "income", years: 5 },
      },
      {
        type: "estimatesNode",
        attrs: { ticker: t === "TICKER" ? "" : t },
      },
      {
        type: "chartNode",
        attrs: {
          ticker: t === "TICKER" ? "" : t,
          range: "1Y",
          kind: "area",
          engine: "lightweight",
        },
      },
      divider(),
      h2("4. Valuation"),
      p("Triangulate DCF, multiples, and scenarios. State your base case clearly."),
      {
        type: "valuationNode",
        attrs: { ticker: t === "TICKER" ? "" : t },
      },
      { type: "scenarioNode" },
      divider(),
      h2("5. Investment thesis"),
      callout("Bull case · Base case · Bear case — write the three in your own words."),
      p(""),
      divider(),
      h2("6. Catalysts"),
      p("Near-term events that could re-rate the stock (earnings, product, regulation, capital return)."),
      p(""),
      divider(),
      h2("7. Risks"),
      p("What breaks the thesis. Rank by severity and probability."),
      p(""),
      divider(),
      h2("8. Appendix"),
      p("Sources, model notes, and disclosures. Platform disclosure block stays mandatory at publish."),
    ],
  };
}

function earningsRecap(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  return {
    type: "doc",
    content: [
      h2("Earnings snapshot"),
      callout(`Post-earnings note for ${t}. Lead with beat/miss and guidance.`),
      {
        type: "estimatesNode",
        attrs: { ticker: t === "TICKER" ? "" : t },
      },
      {
        type: "chartNode",
        attrs: {
          ticker: t === "TICKER" ? "" : t,
          range: "3M",
          kind: "candles",
          engine: "lightweight",
        },
      },
      h2("What changed"),
      p(""),
      h2("Guidance and outlook"),
      p(""),
      h2("Thesis update"),
      p(""),
      h2("Risks to watch"),
      p(""),
    ],
  };
}

function quickCall(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  return {
    type: "doc",
    content: [
      h2("The trade"),
      callout(`Short conviction note on ${t}. State the setup in two sentences.`),
      {
        type: "chartNode",
        attrs: {
          ticker: t === "TICKER" ? "" : t,
          range: "3M",
          kind: "area",
          engine: "lightweight",
        },
      },
      h2("Why now"),
      p(""),
      h2("Invalidation"),
      p(""),
    ],
  };
}

export const TIPTAP_REPORT_TEMPLATES: TiptapReportTemplate[] = [
  {
    id: "initiating-coverage",
    name: "Initiating coverage",
    description: "Full equity research scaffold: overview, financials, valuation, risks",
    build: initiatingCoverage,
  },
  {
    id: "earnings-recap",
    name: "Earnings recap",
    description: "Post-print structure with estimates and price chart",
    build: earningsRecap,
  },
  {
    id: "quick-call",
    name: "Quick call",
    description: "Short conviction note with chart",
    build: quickCall,
  },
];

export function getTiptapTemplate(id: string): TiptapReportTemplate | undefined {
  return TIPTAP_REPORT_TEMPLATES.find((t) => t.id === id);
}

export function applyTiptapTemplate(
  id: string,
  ticker?: string,
  peers?: string[],
): JSONContent | null {
  const tpl = getTiptapTemplate(id);
  return tpl ? tpl.build(ticker, peers) : null;
}
