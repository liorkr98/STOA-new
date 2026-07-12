"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";

export type ShowcaseCall = {
  id: string;
  ticker: string;
  direction: "long" | "short";
  title: string;
  score: number | null;
  targetLabel: string | null;
  deltaLabel: string | null;
  href?: string;
};

const FALLBACK: ShowcaseCall[] = [
  {
    id: "nvda",
    ticker: "NVDA",
    direction: "long",
    title: "Inference margin expansion into H2",
    score: 78,
    targetLabel: "Target $185",
    deltaLabel: "+12.4%",
  },
  {
    id: "meta",
    ticker: "META",
    direction: "long",
    title: "Ad mix shift underpriced vs peers",
    score: 71,
    targetLabel: "Target $720",
    deltaLabel: "+8.1%",
  },
  {
    id: "cost",
    ticker: "COST",
    direction: "long",
    title: "Membership flywheel still compounding",
    score: 82,
    targetLabel: "Target $1,050",
    deltaLabel: "+5.2%",
  },
  {
    id: "intc",
    ticker: "INTC",
    direction: "short",
    title: "Foundry ramp still a capital sink",
    score: 64,
    targetLabel: "Target $28",
    deltaLabel: "−9.6%",
  },
  {
    id: "amzn",
    ticker: "AMZN",
    direction: "long",
    title: "AWS growth re-accelerates on AI spend",
    score: 74,
    targetLabel: "Target $245",
    deltaLabel: "+6.8%",
  },
];

/** Fan positions around the seal: Dropship-style depth, Stoa tokens. */
const FAN = [
  { x: -280, y: 28, rotate: -8, opacity: 0.55, scale: 0.9, z: 1, delay: 0.05 },
  { x: -150, y: -8, rotate: -4, opacity: 0.85, scale: 0.96, z: 3, delay: 0.1 },
  { x: 0, y: -36, rotate: 0, opacity: 1, scale: 1, z: 5, delay: 0.15 },
  { x: 150, y: -8, rotate: 4, opacity: 0.85, scale: 0.96, z: 3, delay: 0.2 },
  { x: 280, y: 28, rotate: 8, opacity: 0.55, scale: 0.9, z: 1, delay: 0.25 },
] as const;

function CallCard({ call, className }: { call: ShowcaseCall; className?: string }) {
  const up = call.direction === "long";
  const inner = (
    <div
      className={cn(
        "w-[220px] rounded-[var(--radius-card)] border border-border bg-surface p-3.5 text-left",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="num text-xs font-semibold tracking-wide">{call.ticker}</span>
        <span
          className={cn(
            "rounded-[var(--r-tag)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
            up ? "bg-[color-mix(in_srgb,var(--up)_12%,transparent)] text-[var(--up)]" : "bg-[color-mix(in_srgb,var(--down)_12%,transparent)] text-[var(--down)]",
          )}
        >
          {up ? "Buy" : "Sell"}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 font-display text-sm font-semibold leading-snug text-text">
        {call.title}
      </p>
      <div className="mt-3 flex items-end justify-between gap-2 border-t border-border pt-2.5">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-faint">Track Score</p>
          <p className="num text-lg font-semibold tabular-nums text-text">{call.score ?? "-"}</p>
        </div>
        <div className="text-right">
          {call.targetLabel && (
            <p className="num text-[11px] text-text-mute">{call.targetLabel}</p>
          )}
          {call.deltaLabel && (
            <p
              className={cn(
                "num text-sm font-semibold tabular-nums",
                call.deltaLabel.startsWith("−") || call.deltaLabel.startsWith("-")
                  ? "text-[var(--down)]"
                  : "text-[var(--up)]",
              )}
            >
              {call.deltaLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (call.href) {
    return (
      <Link href={call.href} className="block focus-ring rounded-[var(--radius-card)]">
        {inner}
      </Link>
    );
  }
  return inner;
}

export function LandingHero({ calls }: { calls?: ShowcaseCall[] }) {
  const reduce = useReducedMotion();
  const cards = (calls && calls.length >= 3 ? calls : FALLBACK).slice(0, 5);

  return (
    <section className="relative overflow-hidden px-5 pb-8 pt-10 sm:pt-14">
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <motion.p
          className="inline-flex items-center gap-2 rounded-[var(--r-tag)] border border-border bg-surface px-3 py-1 text-xs font-medium text-text-mute"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
        >
          <span className="pulse-dot h-1.5 w-1.5 rounded-[1px] bg-[var(--ink)]" aria-hidden />
          Locked calls. Graded track records. Paid research.
        </motion.p>

        <motion.h1
          className="mt-6 font-display text-[clamp(2.25rem,1.4rem+3.5vw,3.75rem)] font-semibold leading-[1.08] tracking-tight text-text"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.04, ease: [0.23, 1, 0.32, 1] }}
        >
          Discover research worth{" "}
          <span className="underline decoration-[color-mix(in_srgb,var(--ink)_28%,transparent)] decoration-2 underline-offset-[0.12em]">
            trusting
          </span>
        </motion.h1>

        <motion.p
          className="mt-4 max-w-xl text-base leading-relaxed text-text-mute sm:text-lg"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.08, ease: [0.23, 1, 0.32, 1] }}
        >
          Independent analysts lock price targets on the record. Stoa fact-checks claims, grades
          outcomes, and pays creators when investors unlock their work.
        </motion.p>

        <motion.div
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.12, ease: [0.23, 1, 0.32, 1] }}
        >
          <Link href="/sign-up" className={buttonClass("primary", "lg")}>
            Start reading free
          </Link>
          <Link href="/dispatch" className={buttonClass("secondary", "lg")}>
            Read today&apos;s dispatch
          </Link>
        </motion.div>
      </div>

      {/* Beam + floating call cards */}
      <div className="relative mx-auto mt-10 h-[340px] w-full max-w-4xl sm:h-[400px]">
        <div
          aria-hidden
          className="absolute left-1/2 top-0 h-[42%] w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,var(--border-strong),var(--ink))]"
        />

        <motion.div
          className="absolute left-1/2 top-[38%] z-10 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[var(--radius-card)] border-2 border-[var(--ink)] bg-paper"
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.24, delay: 0.18, ease: [0.23, 1, 0.32, 1] }}
          aria-hidden
        >
          <span className="font-display text-lg font-semibold tracking-[0.12em] text-text">S</span>
        </motion.div>

        <div className="absolute inset-x-0 bottom-0 top-[42%] flex items-center justify-center">
          <div className="relative h-full w-full max-w-3xl">
            {cards.map((call, i) => {
              const pos = FAN[i] ?? FAN[2];
              return (
                <motion.div
                  key={call.id}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2"
                  style={{ zIndex: pos.z }}
                  initial={reduce ? false : { opacity: 0, y: pos.y + 8, x: pos.x, scale: 0.96 }}
                  animate={
                    reduce
                      ? { opacity: pos.opacity, x: pos.x, y: pos.y, rotate: pos.rotate, scale: pos.scale }
                      : {
                          opacity: pos.opacity,
                          x: pos.x,
                          y: [pos.y, pos.y - 6, pos.y],
                          rotate: pos.rotate,
                          scale: pos.scale,
                        }
                  }
                  transition={
                    reduce
                      ? { duration: 0.08 }
                      : {
                          opacity: { duration: 0.24, delay: pos.delay, ease: [0.23, 1, 0.32, 1] },
                          x: { duration: 0.24, delay: pos.delay, ease: [0.23, 1, 0.32, 1] },
                          rotate: { duration: 0.24, delay: pos.delay, ease: [0.23, 1, 0.32, 1] },
                          scale: { duration: 0.24, delay: pos.delay, ease: [0.23, 1, 0.32, 1] },
                          y: {
                            duration: 4.2 + i * 0.35,
                            delay: pos.delay + 0.3,
                            repeat: Infinity,
                            ease: "easeInOut",
                          },
                        }
                  }
                >
                  <CallCard call={call} />
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
