import { z } from "zod";

/** Every block/action the slash menu and toolbar support — returned by the compose agent. */
export const ComposeActionTypeSchema = z.enum([
  "insert_heading",
  "insert_subheading",
  "insert_paragraph",
  "insert_callout",
  "insert_quote",
  "insert_divider",
  "insert_bullet_list",
  "insert_numbered_list",
  "insert_chart",
  "insert_tradingview_chart",
  "insert_diagram",
  "visualize_selection",
  "insert_figure",
  "insert_compare",
  "insert_table",
  "insert_statement",
  "insert_estimates",
  "insert_comparison",
  "insert_valuation",
  "insert_scenario",
  "insert_embed",
  "insert_image",
  "insert_video",
  "insert_formula",
  "replace_selection",
  "apply_template",
]);

export const ComposeAgentActionSchema = z.object({
  action: ComposeActionTypeSchema,
  text: z
    .string()
    .max(4_000)
    .optional()
    .describe("Body text, callout content, diagram prompt, formula LaTeX, or replacement text"),
  ticker: z.string().max(10).optional(),
  tickers: z.array(z.string().max(10)).max(8).optional(),
  range: z.enum(["1D", "1W", "1M", "3M", "1Y", "5Y"]).optional(),
  visualizeMode: z.enum(["chart", "diagram", "both"]).optional(),
  url: z.string().max(500).optional().describe("For embed blocks"),
  templateId: z
    .enum(["initiating-coverage", "earnings-recap", "quick-call"])
    .optional()
    .describe("For apply_template"),
});

export const ComposeAgentResponseSchema = z.object({
  reply: z.string().describe("Short message to the analyst about what you did or suggest"),
  actions: z
    .array(ComposeAgentActionSchema)
    .max(12)
    .describe("Editor actions to run — same capabilities as the slash menu and Visualize"),
});

export type ComposeAgentAction = z.infer<typeof ComposeAgentActionSchema>;
export type ComposeAgentResponse = z.infer<typeof ComposeAgentResponseSchema>;

export const COMPOSE_AGENT_ACTIONS_DOC = `Available editor actions (return in "actions" array):
- apply_template — load a full report scaffold (templateId: initiating-coverage|earnings-recap|quick-call)
- insert_heading / insert_subheading — section titles (optional text)
- insert_paragraph — plain prose (text required) — draft sections freely
- insert_callout — highlighted note (text required)
- insert_quote — blockquote (optional text)
- insert_divider — horizontal rule
- insert_bullet_list / insert_numbered_list — lists (optional text = first item)
- insert_chart — lightweight Stoa price chart (ticker, optional range)
- insert_tradingview_chart — full TradingView widget (ticker, optional range)
- insert_diagram — built-in AI diagram from text (text = prompt)
- visualize_selection — chart/diagram from highlighted text (visualizeMode: chart|diagram|both)
- insert_figure, insert_compare, insert_table, insert_statement, insert_estimates, insert_comparison, insert_valuation, insert_scenario, insert_embed, insert_image, insert_video, insert_formula
- replace_selection — rewrite highlighted text (text required; needs selection)
Use ticker from context when omitted. For peers, pass tickers: [subject, ...peers] (max 4) on insert_comparison / insert_compare / apply_template.
Prefer live data blocks over invented numbers.`;
