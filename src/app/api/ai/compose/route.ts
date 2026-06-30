import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { BlockType } from "@/lib/editor/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * AI compose copilot. Set OPENAI_API_KEY in .env.local for live responses.
 * Without a key, returns structured fallback suggestions.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    messages: ChatMessage[];
    context?: { title?: string; ticker?: string; type?: string };
  };

  const apiKey = process.env.OPENAI_API_KEY;
  const system = `You are Stoa's research writing copilot. Help analysts write institutional-quality equity research.
Be concise. When suggesting structure, name specific blocks: heading, text, thesis, metrics, chart, callout.
Context: ${JSON.stringify(body.context ?? {})}`;

  let reply: string;

  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
          messages: [{ role: "system", content: system }, ...body.messages],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
      const json = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
        error?: { message?: string };
      };
      if (!res.ok) throw new Error(json.error?.message ?? "OpenAI error");
      reply = json.choices?.[0]?.message?.content ?? "No response.";
    } catch (e) {
      reply =
        e instanceof Error
          ? `AI unavailable: ${e.message}. Add OPENAI_API_KEY to enable live assistance.`
          : "AI unavailable.";
    }
  } else {
    const last = body.messages.at(-1)?.content.toLowerCase() ?? "";
    if (last.includes("outline") || last.includes("structure")) {
      reply =
        "Suggested outline:\n1. **Thesis** block — one-line conviction\n2. **Metrics** — revenue, margins, valuation\n3. **Chart** — 6-month price action\n4. **Thesis** — bull vs bear\n5. **Text** — catalysts and risks\n\nAdd OPENAI_API_KEY for tailored drafts.";
    } else if (last.includes("thesis") || last.includes("bull")) {
      reply =
        "Drop a **Thesis** block from the palette. Bull: what has to go right. Bear: what breaks the case. Keep each side to 2-3 sentences.";
    } else {
      reply =
        "I can help outline research, expand your thesis, or suggest blocks. Try: \"Outline a NVDA research note\" or drag blocks from the left panel.\n\nSet OPENAI_API_KEY in .env.local for full AI chat.";
    }
  }

  const suggestedBlocks = suggestBlocksFromReply(reply);
  return NextResponse.json({ reply, suggestedBlocks });
}

function suggestBlocksFromReply(text: string): BlockType[] {
  const lower = text.toLowerCase();
  const types: BlockType[] = [];
  if (lower.includes("thesis")) types.push("thesis");
  if (lower.includes("metric")) types.push("metrics");
  if (lower.includes("chart")) types.push("chart");
  if (lower.includes("heading") || lower.includes("outline")) types.push("heading");
  if (lower.includes("callout")) types.push("callout");
  if (types.length === 0 && lower.includes("text")) types.push("text");
  return [...new Set(types)];
}

export async function GET() {
  return NextResponse.json({
    blocks: ["heading", "text", "thesis", "metrics", "chart", "callout", "divider"],
    hint: "POST messages with context for AI assistance",
  });
}
