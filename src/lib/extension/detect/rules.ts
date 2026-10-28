import type { Resolver } from "@/lib/extension/detect/resolve";
import type { VideoTicker } from "@/lib/extension/types";

/** One stretch of discussion as the AI reports it. It never names a ticker. */
export type Mention = {
  heard_as: string;
  company: string;
  asset_type: "company" | "etf" | "index" | "crypto" | "commodity" | "other";
  start_seconds: number;
  end_seconds: number;
  role: "main_discussion" | "quick_pick" | "passing_example" | "earnings_calendar" | "portfolio_list" | "sponsor" | "other";
  speaker_stance: "bullish" | "bearish" | "neutral" | "mixed" | "none";
  explicit_rating: "buy" | "avoid" | "hold" | "none";
  conditional: boolean;
  what: string;
};

/** Seconds of discussion that earn a pop-up card without an explicit rating. */
export const CARD_SECONDS = 45;

const NOISE: ReadonlySet<Mention["role"]> = new Set(["passing_example", "earnings_calendar", "portfolio_list", "sponsor", "other"]);
const NOT_TRADABLE: ReadonlySet<Mention["asset_type"]> = new Set(["index", "crypto", "commodity", "other"]);

function stanceOf(m: Mention): VideoTicker["stance"] {
  if (m.explicit_rating === "buy") return "bull";
  if (m.explicit_rating === "avoid") return "bear";
  if (m.speaker_stance === "bullish") return "bull";
  if (m.speaker_stance === "bearish") return "bear";
  return null;
}

const length = (m: Mention) => Math.max(0, m.end_seconds - m.start_seconds);

/**
 * The noise filter. Of everything named in a video, a ticker earns:
 *   a pop-up card    discussed 45+ seconds in all, or given an explicit buy / avoid;
 *   a chip in the    a quick pick the speaker takes a side on;
 *   "In this video" line
 *   nothing          earnings calendars, passing examples, portfolio lists, sponsor
 *                    and broker plugs, indexes, coins, and names that resolve to no
 *                    listed ticker.
 * The card belongs to the ticker's longest stretch, and its stance is that
 * stretch's (an explicit rating anywhere wins).
 */
export function applyRules(mentions: Mention[], resolve: Resolver): VideoTicker[] {
  const byTicker = new Map<string, { name: string; etf: boolean; stretches: Mention[] }>();
  for (const m of mentions) {
    if (NOISE.has(m.role) || NOT_TRADABLE.has(m.asset_type)) continue;
    if (!(m.end_seconds >= m.start_seconds)) continue;
    const hit = resolve(m.company, m.heard_as);
    if (!hit) continue;
    const group = byTicker.get(hit.ticker) ?? { name: hit.name, etf: hit.etf, stretches: [] };
    group.etf ||= m.asset_type === "etf";
    group.stretches.push(m);
    byTicker.set(hit.ticker, group);
  }

  const out: VideoTicker[] = [];
  for (const [ticker, { name, etf, stretches }] of byTicker) {
    const total = stretches.reduce((sum, m) => sum + length(m), 0);
    const rated = stretches.find((m) => m.explicit_rating === "buy" || m.explicit_rating === "avoid");
    const longest = stretches.reduce((a, b) => (length(b) > length(a) ? b : a));
    const lead = rated ?? longest;
    const stance = stanceOf(lead);
    const kind: VideoTicker["kind"] | null = total >= CARD_SECONDS || rated ? "card" : stance ? "line" : null;
    if (!kind) continue;
    out.push({
      ticker,
      name,
      what: lead.what?.trim() || null,
      etf,
      kind,
      start: Math.round(longest.start_seconds),
      end: Math.round(Math.max(longest.end_seconds, longest.start_seconds + 1)),
      stance,
      conditional: lead.conditional,
    });
  }
  return out.sort((a, b) => a.start - b.start);
}
