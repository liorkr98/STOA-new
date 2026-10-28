import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Mention } from "@/lib/extension/detect/rules";
import type { DetectRequest } from "@/lib/extension/types";

export const DETECT_MODEL = "claude-haiku-5-5";

const MentionSchema = z.object({
  heard_as: z.string(),
  company: z.string(),
  asset_type: z.enum(["company", "etf", "index", "crypto", "commodity", "other"]),
  start_seconds: z.number(),
  end_seconds: z.number(),
  role: z.enum(["main_discussion", "quick_pick", "passing_example", "earnings_calendar", "portfolio_list", "sponsor", "other"]),
  speaker_stance: z.enum(["bullish", "bearish", "neutral", "mixed", "none"]),
  explicit_rating: z.enum(["buy", "avoid", "hold", "none"]),
  conditional: z.boolean(),
  what: z.string(),
});

const OutputSchema = z.object({ mentions: z.array(MentionSchema) });

const SYSTEM = `You read the auto-generated transcript of a finance video (often Hebrew, sometimes English) and list the stretches in which a specific listed company or fund is discussed.

Auto-captions garble names, especially in Hebrew: "גולמן סקס" is Goldman Sachs, "CG" can be Constellation Energy, "מתה" or "למטה" can be Meta, "app 111" is AppLovin, "Marll" is Marvell. Work out which real company the speaker means from context.

For each stretch of discussion return one entry:
- heard_as: the words as they appear in the transcript.
- company: the official English name of the company or fund (for example "Goldman Sachs Group", "Alphabet", "Financial Select Sector SPDR Fund"). Never a ticker symbol.
- asset_type: company, etf, index (S&P 500, Nasdaq 100, Dow), crypto (a coin itself, not a fund holding it), commodity, or other.
- start_seconds / end_seconds: from the first to the last line of this stretch, using the bracketed seconds.
- role:
  main_discussion: the speaker actually analyses this name.
  quick_pick: a brief named pick or call, usually in a list of picks.
  passing_example: named in passing to illustrate something else.
  earnings_calendar: read out from a list of upcoming earnings or events.
  portfolio_list: read out as a holding or a list of holdings without analysis.
  sponsor: a sponsor, broker or app being promoted.
  other: anything else.
- speaker_stance: the speaker's OWN view in this stretch (bullish, bearish, neutral, mixed, or none). Views the speaker quotes from analysts, banks or other people do not count. Judge once for the whole stretch.
- explicit_rating: buy if the speaker says outright they would buy or recommend buying (for example "קנייה", "אני קונה"); avoid if they say outright to avoid or sell (for example "נמנע", "מתרחק", "לא נוגע"); hold; otherwise none.
- conditional: true when the view is hedged on a condition (for example "if it breaks 200", "only after earnings"). A buy or avoid with a condition ("buy above 46.56") is still explicit_rating buy or avoid, with conditional true.
- what: at most five plain English words on what the company is (for example "Largest US bank").

When the speaker discusses a cryptocurrency or a commodity and names a fund to hold it through (for example "buy IBIT" while talking about bitcoin, or GLD for gold), report the whole stretch about that coin or commodity, from where that discussion starts, as the fund: asset_type etf, company the fund's name (iShares Bitcoin Trust), with the stance and rating the speaker gives it. Only a coin or commodity with no fund named is crypto or commodity.

Merge consecutive mentions of the same name into one stretch. A name discussed again much later is a new stretch. Leave out names that are only mentioned with no discussion if they are not quick picks.`;

function transcriptText(req: DetectRequest): string {
  return req.segments.map((s) => `[${Math.round(s.start)}] ${s.text}`).join("\n");
}

export class DetectionUnavailable extends Error {}

export const DETECT_MAX_TOKENS = 16000;

export function transcriptChars(req: DetectRequest): number {
  return transcriptText(req).length;
}

/** Asks Claude Haiku which companies are discussed, and when. Tickers are not its job. */
export async function readMentions(req: DetectRequest): Promise<{ mentions: Mention[]; inputTokens: number; outputTokens: number }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new DetectionUnavailable("ANTHROPIC_API_KEY is not set on the server");
  const client = new Anthropic({ apiKey });
  const response = await client.messages.parse({
    model: DETECT_MODEL,
    max_tokens: DETECT_MAX_TOKENS,
    output_config: { effort: "high", format: zodOutputFormat(OutputSchema) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Transcript language: ${req.language}. Each line starts with its time in seconds.\n\n${transcriptText(req)}`,
      },
    ],
  });
  const usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
  if (response.stop_reason === "refusal") return { mentions: [], ...usage };
  return { mentions: response.parsed_output?.mentions ?? [], ...usage };
}
