"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Editor } from "@tiptap/react";
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
  Landmark,
  Target,
  LineChart,
  Calculator,
  Wand2,
  CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/design/cn";
import { buttonClass } from "@/components/ui/button";
import type { ComposeAgentAction } from "@/lib/ai/compose-actions";
import {
  executeComposeActions,
  type ComposeEditorContext,
} from "@/lib/editor/tiptap/compose-agent";
import { detectTicker, detectTickers } from "@/lib/editor/tiptap/ticker-detect";

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
  applied?: string[];
  actionErrors?: string[];
}

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

function statementCard(ticker: string): ResultCard {
  return {
    kind: "statement",
    icon: Landmark,
    label: `${ticker} financials`,
    subtitle: "EDGAR statement",
    node: { type: "statementNode", attrs: { ticker, kind: "income", years: 5 } },
  };
}

function estimatesCard(ticker: string): ResultCard {
  return {
    kind: "estimates",
    icon: Target,
    label: `${ticker} estimates`,
    subtitle: "Consensus vs actuals",
    node: { type: "estimatesNode", attrs: { ticker } },
  };
}

function comparisonCard(symbols: string[]): ResultCard {
  return {
    kind: "comparison",
    icon: LineChart,
    label: `Compare ${symbols.slice(0, 3).join(", ")}`,
    subtitle: "Metric over time",
    node: { type: "comparisonNode", attrs: { symbols, metric: "revenue", years: 5, kind: "line" } },
  };
}

function valuationCard(ticker: string): ResultCard {
  return {
    kind: "valuation",
    icon: Calculator,
    label: `${ticker} valuation`,
    subtitle: "DCF scaffold",
    node: { type: "valuationNode", attrs: { ticker } },
  };
}

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
  {
    kind: "statement",
    icon: Landmark,
    label: "Financial statement",
    subtitle: "EDGAR income / balance / cash flow",
    node: { type: "statementNode", attrs: { kind: "income", years: 5 } },
  },
  {
    kind: "estimates",
    icon: Target,
    label: "Estimates",
    subtitle: "Consensus EPS vs actuals",
    node: { type: "estimatesNode", attrs: {} },
  },
  {
    kind: "comparison",
    icon: LineChart,
    label: "Metric comparison",
    subtitle: "A metric across tickers",
    node: { type: "comparisonNode", attrs: {} },
  },
  {
    kind: "valuation",
    icon: Calculator,
    label: "Valuation (DCF)",
    subtitle: "Fair value + sensitivity",
    node: { type: "valuationNode", attrs: {} },
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
 * Compose agent panel — structured AI actions (AI SDK generateObject) execute
 * slash-menu blocks, diagrams, and selection edits directly in the report.
 */
export function AskPanel({
  open,
  onClose,
  context,
  credits,
  onCreditsChange,
  onInsertNode,
  editor,
  getEditorContext,
}: {
  open: boolean;
  onClose: () => void;
  context: { title?: string; ticker?: string };
  credits: number;
  onCreditsChange?: (n: number) => void;
  onInsertNode: (node: JSONContent) => void;
  editor: Editor | null;
  getEditorContext: () => ComposeEditorContext & {
    documentExcerpt?: string;
    title?: string;
    ticker?: string;
  };
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
        const editorCtx = getEditorContext();
        const res = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.map(({ role, content }) => ({ role, content })),
            context: {
              ticker: context.ticker ?? editorCtx.reportTicker,
              title: context.title ?? editorCtx.title,
              documentExcerpt: editorCtx.documentExcerpt,
              selection: editorCtx.selection,
            },
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          actions?: ComposeAgentAction[];
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

        let applied: string[] = [];
        let actionErrors: string[] = [];
        if (editor && data.actions?.length) {
          const result = executeComposeActions(editor, data.actions, editorCtx);
          applied = result.applied;
          actionErrors = result.errors;
        }

        const cards: ResultCard[] = [];
        if (data.reply && !applied.some((a) => a.toLowerCase().includes("callout"))) {
          cards.push(textCard(data.reply));
        }
        const ticker = detectTicker(text, context.ticker);
        if (/chart|price|graph/i.test(text) && ticker && !applied.some((a) => a.toLowerCase().includes("chart"))) {
          cards.push(chartCard(ticker));
        }
        if (/statement|financials|10-?k/i.test(text) && ticker) cards.push(statementCard(ticker));
        if (/estimate|consensus|\beps\b/i.test(text) && ticker) cards.push(estimatesCard(ticker));
        if (/compar|versus|\bvs\b|peers?/i.test(text)) {
          const symbols = detectTickers(text, context.ticker);
          if (symbols.length) cards.push(comparisonCard(symbols));
        }
        if (/valuation|\bdcf\b|fair value/i.test(text) && ticker) cards.push(valuationCard(ticker));

        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply ?? "Done.",
            cards: cards.length ? cards : undefined,
            applied: applied.length ? applied : undefined,
            actionErrors: actionErrors.length ? actionErrors : undefined,
          },
        ]);
      } catch {
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "Could not reach AI. Check your connection." },
        ]);
      }
    });
  }

  const quick = [
    "Add NVDA chart and diagram from my selection",
    "Insert financials and estimates",
    "Outline with headings",
  ];

  if (!open) return null;

  return (
    <aside
      className={cn(
        "fixed inset-y-0 right-0 z-40 flex w-[min(400px,100vw)] flex-col border-l border-border bg-surface",
        "shadow-[var(--shadow-card)]",
      )}
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
            Ask me to edit your report, insert blocks (same as the slash menu), build OpenNapkin
            diagrams, or visualize your selection. Highlight text first for rewrite / visualize
            commands.
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
            {m.applied && m.applied.length > 0 && (
              <div className="mr-2 rounded-[var(--radius-btn)] border border-accent/30 bg-accent-weak px-3 py-2">
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-accent">
                  <CheckCircle2 size={14} />
                  Applied in your report
                </p>
                <ul className="mt-1 space-y-0.5 text-[11px] text-text-mute">
                  {m.applied.map((a) => (
                    <li key={a}>· {a}</li>
                  ))}
                </ul>
              </div>
            )}
            {m.actionErrors && m.actionErrors.length > 0 && (
              <p className="mr-2 text-[11px] text-[var(--down)]">{m.actionErrors.join(" · ")}</p>
            )}
            {m.cards && m.cards.length > 0 && (
              <div className="mr-2 flex flex-col gap-1.5">
                <p className="t-meta flex items-center gap-1 px-1 text-[10px]">
                  <Wand2 size={11} /> Or drag these into the report
                </p>
                {m.cards.map((c, j) => (
                  <DraggableCard key={j} card={c} onInsert={onInsertNode} />
                ))}
              </div>
            )}
          </div>
        ))}
        {pending && <p className="t-meta animate-pulse px-1">Thinking…</p>}
        {error && <p className="text-sm text-[var(--down)]">{error}</p>}
      </div>

      <div className="border-t border-border p-3">
        <p className="t-eyebrow mb-1.5 text-[10px]">Insert a block manually</p>
        <div className="mb-3 max-h-36 overflow-y-auto flex flex-col gap-1.5">
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
            placeholder="e.g. Add a diagram of my selection…"
            className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-mute"
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
