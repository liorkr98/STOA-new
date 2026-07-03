"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { JSONContent } from "@tiptap/core";
import {
  Sparkle,
  X,
  ArrowRight,
  ChartCandlestick,
  Sigma,
  Columns3,
  Table,
  Quote,
  GripVertical,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/design/cn";
import { buttonClass } from "@/components/ui/button";

interface ResultCard {
  kind: string;
  icon: LucideIcon;
  label: string;
  subtitle: string;
  node: JSONContent;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  cards?: ResultCard[];
}

const TICKER_RE = /\b[A-Z]{1,5}\b/;

function detectTicker(text: string, fallback?: string): string {
  const m = text.toUpperCase().match(TICKER_RE);
  return (m?.[0] ?? fallback ?? "").toUpperCase();
}

/** A neutral summary the analyst absorbs into their own prose -- never a
 * thesis or a call. Lands as a callout so it reads as pulled-in, not written. */
function textCard(reply: string): ResultCard {
  return {
    kind: "text",
    icon: Quote,
    label: "Summary",
    subtitle: "Drops in as a callout you can edit",
    node: { type: "callout", content: [{ type: "text", text: reply.slice(0, 600) }] },
  };
}

function chartCard(ticker: string): ResultCard {
  return {
    kind: "chart",
    icon: ChartCandlestick,
    label: `${ticker} chart`,
    subtitle: "Live price, pre-configured",
    node: { type: "chartNode", attrs: { ticker, range: "3M", kind: "area" } },
  };
}

// Structure scaffolds -- the AI suggests the right node; the analyst fills the
// numbers with their source. The product never fabricates unsourced figures.
const SCAFFOLDS: ResultCard[] = [
  {
    kind: "figure",
    icon: Sigma,
    label: "Data figure",
    subtitle: "One sourced number",
    node: { type: "dataFigureNode", attrs: {} },
  },
  {
    kind: "compare",
    icon: Columns3,
    label: "Peer comparison",
    subtitle: "2-4 tickers",
    node: { type: "compareNode", attrs: {} },
  },
  {
    kind: "table",
    icon: Table,
    label: "Data table",
    subtitle: "Rows and columns",
    node: { type: "financialTableNode", attrs: {} },
  },
];

function DraggableCard({ card, onInsert }: { card: ResultCard; onInsert: (n: JSONContent) => void }) {
  const Icon = card.icon;
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/stoa-node", JSON.stringify(card.node));
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="group flex cursor-grab items-center gap-2.5 rounded-[var(--radius-btn)] border border-border bg-bg p-2.5 transition-colors hover:border-accent/40 active:cursor-grabbing"
    >
      <GripVertical size={13} className="shrink-0 text-text-faint" />
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-btn)] border border-border text-accent">
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-text">{card.label}</span>
        <span className="block truncate text-[11px] text-text-faint">{card.subtitle}</span>
      </span>
      <button
        type="button"
        onClick={() => onInsert(card.node)}
        className="shrink-0 rounded-[var(--radius-btn)] px-2 py-1 text-[11px] font-medium text-text-mute transition-colors hover:bg-surface-2 hover:text-text focus-ring"
      >
        Insert
      </button>
    </div>
  );
}

/**
 * The AI ask-panel (docs Compose-Deep-Dive Part 4). A place the analyst goes
 * to ask, deliberately -- off by default, opened from the top bar. Answers
 * come back as typed, draggable cards that drop into the report as real
 * Layer 3 nodes (drag is the hero; "Insert" is the fallback). Hard limits:
 * it surfaces data and neutral summaries, never the thesis or the call, and
 * every card is assist-marked so the analyst verifies before locking.
 */
export function AskPanel({
  open,
  onClose,
  context,
  credits,
  onCreditsChange,
  onInsertNode,
}: {
  open: boolean;
  onClose: () => void;
  context: { title?: string; ticker?: string };
  credits: number;
  onCreditsChange?: (n: number) => void;
  onInsertNode: (node: JSONContent) => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || pending) return;
    const history = [...messages, { role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    start(async () => {
      try {
        const res = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            context: { ticker: context.ticker, title: context.title },
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          error?: string;
          have?: number;
          need?: number;
          credits_remaining?: number;
        };
        if (!res.ok) {
          setError(
            res.status === 402
              ? `Need ${data.need} credits (you have ${data.have}).`
              : data.error ?? "AI request failed",
          );
          return;
        }
        setError(null);
        if (typeof data.credits_remaining === "number") onCreditsChange?.(data.credits_remaining);

        const cards: ResultCard[] = [];
        if (data.reply) cards.push(textCard(data.reply));
        const wantsChart = /chart|price|graph/i.test(text);
        const ticker = detectTicker(text, context.ticker);
        if (wantsChart && ticker) cards.push(chartCard(ticker));

        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply ?? "Here's what I found.", cards },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Could not reach AI. Check your connection." },
        ]);
      }
    });
  }

  const quick = ["Summarize the bull case", "Main risks cited", "Show me a chart"];

  if (!open) return null;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-[min(380px,100vw)] flex-col border-l border-border bg-surface",
        "shadow-[var(--shadow-card)] data-[open]:animate-[panel-in-x_var(--dur-3)_var(--ease-out)]",
      )}
      data-open
      role="dialog"
      aria-label="Research AI"
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <Sparkle size={16} className="text-accent" />
        <p className="text-sm font-semibold">Research AI</p>
        <span className="t-meta text-[11px]">{credits} credits</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="tap-target ml-auto rounded-[var(--r-tag)] p-1 text-text-faint transition-colors hover:text-text focus-ring"
        >
          <X size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="scroll-area flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="t-body text-sm">
            Ask for data, a chart, or a neutral summary. Results come back as cards you drag into
            the report. The thesis stays yours.
          </p>
        )}

        {messages.map((m, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div
              className={cn(
                "rounded-[var(--radius-btn)] px-3 py-2.5 text-sm leading-relaxed",
                m.role === "user"
                  ? "ml-8 bg-[var(--ink)] text-[var(--paper)]"
                  : "mr-2 border border-border bg-bg text-text",
              )}
            >
              {m.content}
            </div>
            {m.cards && m.cards.length > 0 && (
              <div className="mr-2 flex flex-col gap-1.5">
                {m.cards.map((c, j) => (
                  <DraggableCard key={j} card={c} onInsert={onInsertNode} />
                ))}
                <p className="t-meta px-1 text-[10px]">AI assist. Verify before you lock.</p>
              </div>
            )}
          </div>
        ))}
        {pending && <p className="t-meta animate-pulse px-1">Thinking...</p>}
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      </div>

      <div className="border-t border-border p-3">
        <p className="t-eyebrow mb-1.5 text-[10px]">Insert a block</p>
        <div className="mb-3 flex flex-col gap-1.5">
          {SCAFFOLDS.map((c) => (
            <DraggableCard key={c.kind} card={c} onInsert={onInsertNode} />
          ))}
        </div>

        <div className="mb-2 flex flex-wrap gap-1.5">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => send(q)}
              disabled={pending}
              className="rounded-[var(--radius-btn)] border border-border px-2.5 py-1 text-[11px] text-text-mute transition-colors hover:border-accent/40 hover:text-accent focus-ring"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder="Ask about this ticker..."
            className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-faint"
          />
          <button
            type="button"
            onClick={() => send()}
            disabled={pending}
            className={buttonClass("primary", "sm")}
            aria-label="Send"
          >
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
