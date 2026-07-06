import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { spendAiCredits } from "@/lib/ai/spend";
import type { BlockType } from "@/lib/editor/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    messages: ChatMessage[];
    context?: { title?: string; ticker?: string; type?: string };
    action?: "chat" | "outline";
  };

  const action = body.action ?? (body.messages.at(-1)?.content.toLowerCase().includes("outline") ? "outline" : "chat");
  const spend = await spendAiCredits(action, `Compose ${action}`);
  if (spend.error) {
    return NextResponse.json(
      { error: spend.error, have: spend.have, need: spend.need },
      { status: spend.error === "insufficient_credits" ? 402 : 400 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const system = `You are Stoa's research structure copilot. The analyst owns every word of their thesis, and Stoa grades their published calls against the market, so the opinion must be theirs alone.

HARD RULE, no exceptions: never write, draft, ghostwrite, or suggest the specific wording of the analyst's thesis, opinion, directional view (bull or bear), price target, rating, or call. Never state whether a stock will go up or down, is a buy or sell, or is over or under valued. If asked to "write the thesis", "make the bull case", "give a price target", or "tell me if this is a buy", refuse briefly and redirect to what you can do.

You CAN help with: document structure and outlines (which kinds of blocks to add and in what order), clarity, grammar, tightening prose the analyst already wrote, formatting, suggesting questions the analyst should answer or risks they should address, and explaining how Stoa's blocks work. When suggesting structure, name specific blocks: heading, text, thesis, metrics, chart, callout. Leave every block the analyst fills in blank for them to write.

Be concise. Context: ${JSON.stringify(body.context ?? {})}`;

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
          temperature: 0.3,
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
          ? `AI unavailable: ${e.message}`
          : "AI unavailable.";
    }
  } else {
    const last = body.messages.at(-1)?.content.toLowerCase() ?? "";
    if (last.includes("outline") || last.includes("structure")) {
      reply =
        "Suggested outline:\n1. Thesis block\n2. Metrics\n3. Chart\n4. Bull/bear thesis\n5. Catalysts and risks\n\nAdd OPENAI_API_KEY for tailored drafts.";
    } else if (last.includes("thesis") || last.includes("bull")) {
      reply =
        "Use a Thesis block: bull case on the left, bear on the right. Keep each side to 2-3 sentences.";
    } else {
      reply =
        "Ask for an outline, thesis help, or drag blocks from the left panel. Set OPENAI_API_KEY for full AI.";
    }
  }

  const suggestedBlocks = suggestBlocksFromReply(reply);
  return NextResponse.json({
    reply,
    suggestedBlocks,
    credits_remaining: spend.remaining,
  });
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
