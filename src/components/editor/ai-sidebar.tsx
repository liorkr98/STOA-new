"use client";

import { useRef, useState, useTransition } from "react";
import { PaperPlaneTilt, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { buttonClass } from "@/components/ui/button";
import type { BlockType } from "@/lib/editor/types";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AiSidebar({
  context,
  onInsertBlocks,
}: {
  context: { title?: string; ticker?: string; type?: string };
  onInsertBlocks: (types: BlockType[]) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your research copilot. Ask for an outline, thesis help, or drag blocks from the left. I'll suggest structure and you stay in control.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  function send() {
    const text = input.trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    start(async () => {
      try {
        const res = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: next, context }),
        });
        const data = (await res.json()) as {
          reply?: string;
          suggestedBlocks?: BlockType[];
        };
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply ?? "No response." },
        ]);
        if (data.suggestedBlocks?.length) onInsertBlocks(data.suggestedBlocks);
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
      } catch {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Could not reach AI. Check your connection." },
        ]);
      }
    });
  }

  const quick = ["Outline this research", "Expand bull case", "Add metrics block"];

  return (
    <aside className="glass flex h-full min-h-0 flex-col overflow-hidden border-accent/20">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkle size={18} weight="fill" className="text-accent accent-glow" />
        <div>
          <p className="text-sm font-semibold">Research AI</p>
          <p className="t-meta">Conversational copilot</p>
        </div>
        <span className="pulse-dot ml-auto h-2 w-2 rounded-full bg-accent" />
      </div>

      <div ref={scrollRef} className="scroll-area flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn(
              "rounded-[var(--radius-btn)] px-3 py-2.5 text-sm leading-relaxed",
              m.role === "user"
                ? "ml-6 bg-accent text-accent-ink"
                : "mr-4 border border-border bg-bg/60 text-text-mute",
            )}
          >
            {m.content}
          </div>
        ))}
        {pending && (
          <p className="t-meta animate-pulse px-1">Thinking...</p>
        )}
      </div>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="rounded-full border border-border px-2.5 py-0.5 text-[11px] text-text-mute hover:border-accent/40 hover:text-accent"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask anything..."
            className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg/80 px-3 py-2 text-sm focus-ring"
          />
          <button
            type="button"
            onClick={send}
            disabled={pending}
            className={buttonClass("primary", "sm")}
            aria-label="Send"
          >
            <PaperPlaneTilt size={16} weight="fill" />
          </button>
        </div>
      </div>
    </aside>
  );
}
