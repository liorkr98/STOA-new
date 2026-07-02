"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CaretDown,
  ChartLineUp,
  Columns,
  DotsSixVertical,
  PaperPlaneTilt,
  Paragraph,
  Quotes,
  Rows,
  Sparkle,
  TextH,
} from "@phosphor-icons/react";
import { cn } from "@/lib/design/cn";
import { buttonClass } from "@/components/ui/button";
import { BLOCK_META, type BlockType } from "@/lib/editor/types";

const CHIP_ICONS: Record<BlockType, React.ReactNode> = {
  heading: <TextH size={14} />,
  text: <Paragraph size={14} />,
  callout: <Quotes size={14} />,
  chart: <ChartLineUp size={14} />,
  thesis: <Columns size={14} />,
  metrics: <Rows size={14} />,
  divider: <Paragraph size={14} />,
};

interface Message {
  role: "user" | "assistant";
  content: string;
  /** Blocks the AI suggested for this reply. Rendered as draggable chips the
   * author explicitly pulls into the canvas -- never silently auto-inserted. */
  blocks?: BlockType[];
}

/**
 * Draggable suggestion chip. Uses the same application/stoa-block payload as
 * the left palette, so the canvas's existing drop handling accepts both.
 * Click inserts at the end; drag places it wherever the author drops it.
 */
function BlockChip({ type, onInsert }: { type: BlockType; onInsert: () => void }) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/stoa-block", type);
        e.dataTransfer.effectAllowed = "copy";
      }}
      onClick={onInsert}
      title="Drag into the report, or click to add"
      className={cn(
        "inline-flex cursor-grab items-center gap-1.5 rounded-[var(--radius-btn)] border border-accent/40 bg-surface px-2.5 py-1.5",
        "text-xs font-medium text-accent transition-colors hover:bg-accent-weak active:cursor-grabbing focus-ring",
      )}
    >
      <DotsSixVertical size={12} className="text-text-faint" />
      {CHIP_ICONS[type]}
      {BLOCK_META[type].label}
    </button>
  );
}

/**
 * The AI copilot as a floating dock pinned to the bottom-right of the
 * viewport, so it follows the author down the page instead of living at the
 * bottom of a rail (FRONTEND.md 6.2: "collapsible, docked to the editor").
 */
export function AiDock({
  context,
  credits,
  onCreditsChange,
  onInsertBlock,
}: {
  context: { title?: string; ticker?: string; type?: string };
  credits: number;
  onCreditsChange?: (n: number) => void;
  onInsertBlock: (type: BlockType) => void;
}) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "I'm your research copilot. Ask for an outline, a chart, or a pull quote. Suggestions appear as chips you can drag straight into the report.",
    },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      inputRef.current?.focus();
    }
  }, [open, messages.length]);

  function send(preset?: string) {
    const text = (preset ?? input).trim();
    if (!text || pending) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    start(async () => {
      try {
        const res = await fetch("/api/ai/compose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: next.map(({ role, content }) => ({ role, content })),
            context,
          }),
        });
        const data = (await res.json()) as {
          reply?: string;
          suggestedBlocks?: BlockType[];
          error?: string;
          have?: number;
          need?: number;
          credits_remaining?: number;
        };
        if (!res.ok) {
          if (res.status === 402) {
            setError(`Need ${data.need} credits (you have ${data.have}). Convert balance in Wallet.`);
          } else {
            setError(data.error ?? "AI request failed");
          }
          return;
        }
        setError(null);
        if (typeof data.credits_remaining === "number") {
          onCreditsChange?.(data.credits_remaining);
        }
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply ?? "No response.",
            blocks: data.suggestedBlocks?.length ? data.suggestedBlocks : undefined,
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

  const quick = ["Outline this research", "Suggest a chart", "Add a pull quote"];

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {open && (
        <div
          className="surface flex w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden"
          style={{ height: "min(540px, 70dvh)" }}
          role="dialog"
          aria-label="Research AI copilot"
        >
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Sparkle size={16} weight="fill" className="text-accent" />
            <p className="text-sm font-semibold">Research AI</p>
            <span className="t-meta text-[11px]">{credits} credits</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Collapse copilot"
              className="ml-auto rounded-[var(--r-tag)] p-1 text-text-faint transition-colors hover:text-text focus-ring"
            >
              <CaretDown size={16} />
            </button>
          </div>

          <div ref={scrollRef} className="scroll-area flex-1 space-y-3 overflow-y-auto p-4">
            {messages.map((m, i) => (
              <div key={i} className="flex flex-col gap-2">
                <div
                  className={cn(
                    "rounded-[var(--radius-btn)] px-3 py-2.5 text-sm leading-relaxed",
                    m.role === "user"
                      ? "ml-8 bg-[var(--ink)] text-[var(--paper)]"
                      : "mr-4 border border-border bg-surface-2 text-text",
                  )}
                >
                  {m.content}
                </div>
                {m.blocks && (
                  <div className="mr-4 flex flex-wrap gap-1.5">
                    {m.blocks.map((b, j) => (
                      <BlockChip key={`${i}-${j}`} type={b} onInsert={() => onInsertBlock(b)} />
                    ))}
                  </div>
                )}
              </div>
            ))}
            {pending && <p className="t-meta animate-pulse px-1">Thinking...</p>}
            {error && <p className="text-sm text-[var(--down)]">{error}</p>}
          </div>

          <div className="border-t border-border p-3">
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
                placeholder="Ask anything..."
                className="min-w-0 flex-1 rounded-[var(--radius-btn)] border border-border bg-bg px-3 py-2 text-sm focus-ring placeholder:text-text-faint"
              />
              <button
                type="button"
                onClick={() => send()}
                disabled={pending}
                className={buttonClass("primary", "sm")}
                aria-label="Send"
              >
                <PaperPlaneTilt size={16} weight="fill" />
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          "flex items-center gap-2 rounded-[var(--radius-btn)] border px-4 py-2.5 text-sm font-medium shadow-[var(--shadow-card)] transition-colors focus-ring",
          open
            ? "border-border bg-surface text-text-mute hover:text-text"
            : "border-[var(--ink)] bg-[var(--ink)] text-[var(--paper)] hover:opacity-90",
        )}
      >
        <Sparkle size={16} weight="fill" className={open ? "text-accent" : ""} />
        {open ? "Hide copilot" : "Research AI"}
      </button>
    </div>
  );
}
