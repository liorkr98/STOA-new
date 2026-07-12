"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/design/cn";

const FAQS = [
  {
    q: "Is it free to read?",
    a: "Yes. Browsing, following analysts, the leaderboard, and every free report cost nothing. You pay only when you subscribe to an analyst or unlock a paid report, at the price that analyst set.",
  },
  {
    q: "How are calls graded?",
    a: "By the market, not by us. A call locks its entry price the moment it publishes. When its horizon date arrives, the outcome resolves against the real closing price: hit, near, partial, or miss. The full methodology is public on the scoring page.",
  },
  {
    q: "Can an analyst edit or delete a bad call?",
    a: "No. Locked calls are immutable at the database level, enforced by triggers, not policy. Not the analyst, not Stoa. A published miss stays on the record next to the hits, which is exactly why the record means something.",
  },
  {
    q: "What is a Track Score?",
    a: "A 0 to 100 grade computed from an analyst's resolved calls: win rate, profit factor, alpha versus the S&P over the same window, and consistency. It updates only when a call resolves and cannot be bought, reset, or transferred.",
  },
  {
    q: "How do analysts earn?",
    a: "Analysts set their own monthly subscription and per-report prices and keep 90% of every transaction. Stoa takes a flat 10%. The dispatch ranks the day's best work by conviction and track record, never by payment.",
  },
  {
    q: "Is this investment advice?",
    a: "No. Stoa is a research marketplace and publisher, not a broker or adviser. Every report carries the analyst's own disclosures, and every call comes graded so you can judge the source before you trust a word. Do your own research.",
  },
] as const;

/**
 * Landing FAQ. Expansion is an instant layout swap with the answer fading in
 * (opacity only, MOTION.md A.2 law 2); the chevron rotates on transform.
 */
export function LandingFaq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="border-t border-border bg-surface/50">
      <div className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl" style={{ textWrap: "balance" }}>
          Fair questions
        </h2>

        <dl className="mt-10">
          {FAQS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="border-b border-border">
                <dt>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="focus-ring flex w-full items-center justify-between gap-4 rounded-[var(--radius-btn)] py-5 text-left"
                  >
                    <span className="font-display text-lg font-semibold text-text">{item.q}</span>
                    <ChevronDown
                      size={18}
                      strokeWidth={2.5}
                      aria-hidden
                      className={cn(
                        "shrink-0 text-text-mute transition-transform duration-[var(--dur-2)] ease-[var(--ease-in-out)]",
                        isOpen && "rotate-180",
                      )}
                    />
                  </button>
                </dt>
                {isOpen && (
                  <dd className="fade-up pb-5 pr-8 text-base leading-relaxed text-text-mute" style={{ "--fade-y": "0px" } as React.CSSProperties}>
                    {item.a}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
