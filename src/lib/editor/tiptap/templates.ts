import type { JSONContent } from "@tiptap/core";

export type TemplateCategory = "coverage" | "earnings" | "call" | "sector" | "update";

export interface TiptapReportTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  /** Short hint for the picker card */
  length: string;
  /** Wireframe labels for the mini preview */
  preview: string[];
  build: (ticker?: string, peers?: string[]) => JSONContent;
}

function h2(text: string): JSONContent {
  return { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text }] };
}

function h3(text: string): JSONContent {
  return { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text }] };
}

function p(text: string): JSONContent {
  return { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
}

function callout(text: string): JSONContent {
  return { type: "callout", content: [{ type: "text", text }] };
}

function divider(): JSONContent {
  return { type: "horizontalRule" };
}

function bullet(items: string[]): JSONContent {
  return {
    type: "bulletList",
    content: items.map((text) => ({
      type: "listItem",
      content: [p(text)],
    })),
  };
}

function tickerBlocks(t: string, peers: string[] = []) {
  const sym = t === "TICKER" ? "" : t;
  const symbols =
    t === "TICKER"
      ? []
      : [t, ...peers.map((x) => x.toUpperCase()).filter((x) => x && x !== t)].slice(0, 4);
  return { sym, symbols };
}

function chart(t: string, range = "1Y"): JSONContent {
  return {
    type: "chartNode",
    attrs: { ticker: t, range, kind: "area", engine: "lightweight" },
  };
}

function statement(t: string): JSONContent {
  return { type: "statementNode", attrs: { ticker: t, kind: "income", years: 5 } };
}

function estimates(t: string): JSONContent {
  return { type: "estimatesNode", attrs: { ticker: t } };
}

function valuation(t: string): JSONContent {
  return { type: "valuationNode", attrs: { ticker: t } };
}

function comparison(symbols: string[]): JSONContent {
  return {
    type: "comparisonNode",
    attrs: { symbols, metric: "revenue", years: 5, kind: "line" },
  };
}

function peerTable(symbols: string[]): JSONContent | null {
  if (symbols.length < 2) return null;
  return {
    type: "compareNode",
    attrs: {
      tickers: symbols,
      rows: [
        { label: "Market cap", values: symbols.map(() => "") },
        { label: "EV/Revenue", values: symbols.map(() => "") },
        { label: "P/E", values: symbols.map(() => "") },
        { label: "Rev growth", values: symbols.map(() => "") },
        { label: "EBITDA margin", values: symbols.map(() => "") },
      ],
    },
  };
}

function financialTable(): JSONContent {
  return { type: "financialTableNode", attrs: {} };
}

/** Full initiating coverage — Value-by-Raph style multi-section report */
function initiatingCoverage(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const { sym, symbols } = tickerBlocks(t, peers);
  return {
    type: "doc",
    content: [
      callout(
        `${t} · Initiating coverage scaffold. Fill each section; live blocks pull EDGAR and market data.`,
      ),
      h2("Cover summary"),
      p("Investment view in two sentences. What you believe and why now."),
      bullet([
        "Recommendation framing (your words — locked call stays in the publish panel)",
        "Key metric that drives the thesis",
        "Primary catalyst in the next 6–12 months",
      ]),
      divider(),
      h2("1. Company overview"),
      p(`Business model, segments, and geographic mix for ${t}.`),
      h3("History and positioning"),
      p(""),
      h3("Products and revenue drivers"),
      p(""),
      h3("Management and capital allocation"),
      p(""),
      divider(),
      h2("2. Industry and TAM"),
      p("Market size, growth, competitive dynamics, and where pricing power sits."),
      h3("Competitive landscape"),
      p(""),
      ...(symbols.length ? [comparison(symbols)] : []),
      ...(peerTable(symbols) ? [peerTable(symbols)!] : []),
      divider(),
      h2("3. Financial analysis"),
      p("Quality of earnings, margin trajectory, and balance-sheet flexibility."),
      statement(sym),
      estimates(sym),
      chart(sym, "1Y"),
      financialTable(),
      divider(),
      h2("4. Valuation"),
      p("Triangulate DCF, multiples, and scenario weights. State assumptions explicitly."),
      valuation(sym),
      { type: "scenarioNode" },
      divider(),
      h2("5. Investment thesis"),
      callout("Bull · Base · Bear — three paragraphs the reader can stress-test."),
      p(""),
      divider(),
      h2("6. Catalysts"),
      p("Dated events that could re-rate the stock."),
      p(""),
      divider(),
      h2("7. Risks"),
      p("What breaks the thesis. Rank by severity."),
      p(""),
      divider(),
      h2("8. Appendix"),
      p("Model notes, sources, and disclosure reminders."),
    ],
  };
}

/** One-page equity factsheet */
function equityFactsheet(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const { sym, symbols } = tickerBlocks(t, peers);
  return {
    type: "doc",
    content: [
      h2(`${t} · Equity factsheet`),
      callout("One-page snapshot for investors. Lead with the hook, then data."),
      h3("Key facts"),
      bullet([
        "Sector / industry",
        "Market cap and float",
        "Next earnings date",
        "Primary listing / currency",
      ]),
      chart(sym, "1Y"),
      h3("Performance"),
      p("Price action vs benchmark over 1Y. Comment on volatility."),
      estimates(sym),
      h3("Valuation snapshot"),
      valuation(sym),
      ...(peerTable(symbols.slice(0, 4)) ? [peerTable(symbols.slice(0, 4))!] : []),
      h3("Analyst view"),
      p("Two paragraphs: setup, catalyst, and key risk."),
    ],
  };
}

/** Sector update — industry note with tables */
function sectorUpdate(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const { sym, symbols } = tickerBlocks(t, peers);
  return {
    type: "doc",
    content: [
      h2("Sector update"),
      callout(`Industry view anchored on ${t}. Name peers and the macro setup.`),
      h3("Headline"),
      p("One sentence on what changed in the sector this month."),
      h3("Macro and demand"),
      p(""),
      h3("Winners and laggards"),
      p(""),
      ...(symbols.length ? [comparison(symbols)] : []),
      ...(peerTable(symbols) ? [peerTable(symbols)!] : []),
      h3("Stock call — focus name"),
      p(`Why ${t} matters within the group right now.`),
      chart(sym, "3M"),
      h3("What to watch"),
      bullet(["Regulatory / policy", "Channel inventory", "Pricing trends", "Next sector datapoint"]),
    ],
  };
}

/** Comparable companies deep-dive */
function compAnalysis(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const { sym, symbols } = tickerBlocks(t, peers);
  const tableSyms =
    symbols.length >= 2 ? symbols : t !== "TICKER" ? [t, "PEER"] : ["TICKER", "PEER"];
  return {
    type: "doc",
    content: [
      h2(`${t} · Comparable companies`),
      callout("Peer set, multiples, and implied valuation. Cite your comp selection criteria."),
      h3("Peer selection"),
      p("Why these names belong in the set."),
      peerTable(tableSyms)!,
      h3("Multiples over time"),
      ...(symbols.length ? [comparison(symbols)] : []),
      h3("Implied valuation"),
      p("Apply median / 75th percentile multiples to your subject's LTM metrics."),
      valuation(sym),
      h3("Sensitivity"),
      p("Which multiple moves the fair value most?"),
      { type: "scenarioNode" },
    ],
  };
}

/** Investment memo — executive summary + model sections */
function investmentMemo(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const { sym } = tickerBlocks(t, peers);
  return {
    type: "doc",
    content: [
      h2(`${t} · Investment memo`),
      callout("Formal memo structure: summary up front, model and valuation below."),
      h3("Executive summary"),
      p(""),
      h3("Business quality"),
      p("Moat, unit economics, and reinvestment runway."),
      h3("Financial model highlights"),
      statement(sym),
      financialTable(),
      h3("DCF and scenarios"),
      valuation(sym),
      { type: "scenarioNode" },
      h3("Comparable companies"),
      p("How the name trades vs peers on growth-adjusted multiples."),
      h3("Key risks"),
      bullet(["Demand", "Competition", "Balance sheet", "Regulation"]),
    ],
  };
}

function earningsRecap(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const sym = t === "TICKER" ? "" : t;
  return {
    type: "doc",
    content: [
      h2("Earnings recap"),
      callout(`Post-print note for ${t}. Beat/miss, guidance, and thesis impact.`),
      estimates(sym),
      chart(sym, "3M"),
      h3("Headline numbers"),
      bullet(["Revenue vs consensus", "EPS vs consensus", "Guidance change", "Stock reaction"]),
      h3("What changed"),
      p(""),
      h3("Management tone"),
      p(""),
      h3("Model update"),
      statement(sym),
      h3("Thesis impact"),
      p(""),
    ],
  };
}

function earningsPreview(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const sym = t === "TICKER" ? "" : t;
  return {
    type: "doc",
    content: [
      h2("Earnings preview"),
      callout(`Pre-print setup for ${t}. Consensus, setup, and what matters on the call.`),
      estimates(sym),
      h3("Consensus expectations"),
      p(""),
      h3("Setup and positioning"),
      p("How the name traded into the print."),
      chart(sym, "1M"),
      h3("Key lines to watch"),
      bullet(["Revenue growth", "Margin trajectory", "Guidance language", "Capital return"]),
      h3("Scenarios"),
      { type: "scenarioNode" },
    ],
  };
}

function quickCall(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const sym = t === "TICKER" ? "" : t;
  return {
    type: "doc",
    content: [
      h2("The trade"),
      callout(`Conviction note on ${t}. Two-sentence setup.`),
      chart(sym, "3M"),
      h3("Why now"),
      p(""),
      h3("Invalidation"),
      p("What would make you wrong."),
    ],
  };
}

function catalystNote(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const sym = t === "TICKER" ? "" : t;
  return {
    type: "doc",
    content: [
      h2("Catalyst note"),
      callout(`Event-driven setup for ${t}. Name the catalyst and the market debate.`),
      h3("The event"),
      p("Date, format, and what is at stake."),
      h3("Bull vs bear on the catalyst"),
      bullet(["Bull case outcome", "Base case", "Bear case"]),
      chart(sym, "3M"),
      h3("Positioning"),
      p("How you would express the view."),
    ],
  };
}

function deepDive(ticker?: string, peers: string[] = []): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const { sym, symbols } = tickerBlocks(t, peers);
  return {
    type: "doc",
    content: [
      h2(`${t} · Deep dive`),
      callout("Long-form thesis with structured sections and live data blocks."),
      h3("Investment thesis"),
      p(""),
      h3("Business overview"),
      p(""),
      h3("Unit economics and margins"),
      statement(sym),
      h3("Growth drivers"),
      p(""),
      chart(sym, "1Y"),
      h3("Competitive position"),
      ...(symbols.length ? [comparison(symbols)] : []),
      h3("Valuation framework"),
      valuation(sym),
      h3("Risks"),
      p(""),
    ],
  };
}

function companyDashboard(ticker?: string): JSONContent {
  const t = (ticker ?? "").toUpperCase() || "TICKER";
  const sym = t === "TICKER" ? "" : t;
  return {
    type: "doc",
    content: [
      h2(`${t} · Company dashboard`),
      callout("Data-first layout: charts, statements, and key metrics in one scroll."),
      chart(sym, "1Y"),
      chart(sym, "5Y"),
      statement(sym),
      estimates(sym),
      financialTable(),
      { type: "dataFigureNode", attrs: {} },
      valuation(sym),
    ],
  };
}

export const TIPTAP_REPORT_TEMPLATES: TiptapReportTemplate[] = [
  {
    id: "initiating-coverage",
    name: "Initiating coverage",
    description: "Full equity research: overview, industry, financials, valuation, thesis",
    category: "coverage",
    length: "8 sections",
    preview: ["Summary", "Overview", "Industry", "Financials", "Valuation", "Thesis"],
    build: initiatingCoverage,
  },
  {
    id: "investment-memo",
    name: "Investment memo",
    description: "Executive summary with DCF, model highlights, and risk bullets",
    category: "coverage",
    length: "6 sections",
    preview: ["Summary", "Business", "Model", "DCF", "Comps", "Risks"],
    build: investmentMemo,
  },
  {
    id: "deep-dive",
    name: "Deep dive",
    description: "Long-form thesis with margins, growth, and valuation blocks",
    category: "coverage",
    length: "7 sections",
    preview: ["Thesis", "Business", "Margins", "Growth", "Chart", "Valuation"],
    build: deepDive,
  },
  {
    id: "comp-analysis",
    name: "Comparable companies",
    description: "Peer table, multiples, and implied valuation",
    category: "coverage",
    length: "5 sections",
    preview: ["Peers", "Multiples", "Chart", "Implied", "Sensitivity"],
    build: compAnalysis,
  },
  {
    id: "equity-factsheet",
    name: "Equity factsheet",
    description: "One-page snapshot with key facts, chart, and valuation",
    category: "update",
    length: "1 page",
    preview: ["Key facts", "Chart", "Estimates", "Valuation", "View"],
    build: equityFactsheet,
  },
  {
    id: "company-dashboard",
    name: "Company dashboard",
    description: "Data-heavy scroll: dual charts, statements, estimates, DCF",
    category: "update",
    length: "Data blocks",
    preview: ["1Y chart", "5Y chart", "Financials", "Estimates", "DCF"],
    build: companyDashboard,
  },
  {
    id: "sector-update",
    name: "Sector update",
    description: "Industry note with peer comparison and focus stock",
    category: "sector",
    length: "5 sections",
    preview: ["Headline", "Macro", "Peers", "Focus", "Watchlist"],
    build: sectorUpdate,
  },
  {
    id: "earnings-preview",
    name: "Earnings preview",
    description: "Pre-print consensus, setup, and scenarios",
    category: "earnings",
    length: "4 sections",
    preview: ["Consensus", "Setup", "Chart", "Scenarios"],
    build: earningsPreview,
  },
  {
    id: "earnings-recap",
    name: "Earnings recap",
    description: "Post-print beat/miss, guidance, and thesis update",
    category: "earnings",
    length: "5 sections",
    preview: ["Headline", "Changes", "Tone", "Model", "Thesis"],
    build: earningsRecap,
  },
  {
    id: "catalyst-note",
    name: "Catalyst note",
    description: "Event-driven setup with bull/base/bear on the catalyst",
    category: "call",
    length: "3 sections",
    preview: ["Event", "Scenarios", "Position"],
    build: catalystNote,
  },
  {
    id: "quick-call",
    name: "Quick call",
    description: "Short conviction note with chart",
    category: "call",
    length: "1 page",
    preview: ["Trade", "Chart", "Why now", "Invalidation"],
    build: quickCall,
  },
];

export const TEMPLATE_CATEGORIES: { id: TemplateCategory | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "coverage", label: "Coverage" },
  { id: "earnings", label: "Earnings" },
  { id: "sector", label: "Sector" },
  { id: "update", label: "Update" },
  { id: "call", label: "Calls" },
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

export const TEMPLATE_IDS = TIPTAP_REPORT_TEMPLATES.map((t) => t.id) as [
  string,
  ...string[],
];
