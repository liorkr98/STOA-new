"use client";

import { useReducedMotion } from "motion/react";
import { useRef, type MouseEvent } from "react";
import { LandingCallChip } from "@/components/landing/landing-call-chip";
import type { ResolvedCall } from "@/lib/db/predictions";
import { cn } from "@/lib/design/cn";

const SLOTS = [
  {
    className: "left-[2%] top-2 hidden w-[11.5rem] sm:left-[6%] sm:w-[13rem] md:block lg:left-[8%]",
    tilt: "landing-tilt-1",
    float: "landing-float-a",
  },
  {
    className: "right-[2%] top-4 hidden w-[11.5rem] sm:right-[6%] sm:w-[13rem] md:block lg:right-[8%]",
    tilt: "landing-tilt-2",
    float: "landing-float-b",
  },
  {
    className: "left-0 top-[42%] w-[11rem] sm:left-[3%] sm:w-[13rem] lg:left-[4%]",
    tilt: "landing-tilt-3",
    float: "landing-float-c",
  },
  {
    className: "right-0 top-[46%] hidden w-[11rem] sm:right-[3%] sm:w-[13rem] md:block lg:right-[4%]",
    tilt: "landing-tilt-4",
    float: "landing-float-a",
  },
  {
    className: "bottom-2 left-1/2 w-[12rem] -translate-x-1/2 sm:w-[13.5rem]",
    tilt: "landing-tilt-5",
    float: "landing-float-b",
  },
] as const;

/**
 * 21st-sketch stage: ink beam into the seal (the only circle), with real
 * graded calls floating around it. Parallax is transform-only and off under
 * reduced motion.
 */
export function LandingFloatStage({ calls }: { calls: ResolvedCall[] }) {
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const featured = calls.slice(0, SLOTS.length);

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduce || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    stageRef.current.querySelectorAll<HTMLElement>("[data-float-card]").forEach((el, i) => {
      const depth = ((i % 3) + 1) * 3;
      el.style.transform = `translate(${x * depth}px, ${y * depth}px)`;
    });
  }

  function onLeave() {
    if (!stageRef.current) return;
    stageRef.current.querySelectorAll<HTMLElement>("[data-float-card]").forEach((el) => {
      el.style.transform = "";
    });
  }

  return (
    <div
      ref={stageRef}
      className="relative mx-auto h-[28rem] w-full max-w-6xl sm:h-[32rem]"
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      <div
        aria-hidden
        className="absolute left-1/2 top-0 h-[7.5rem] w-px -translate-x-1/2 bg-[linear-gradient(to_bottom,transparent,var(--border-strong),var(--ink))]"
      />
      <div
        aria-hidden
        className="absolute left-1/2 top-[7.35rem] h-1.5 w-1.5 -translate-x-1/2 rounded-[1px] bg-[var(--ink)]"
      />

      {/* Seal — only full circle in the product */}
      <div className="landing-hero-seal absolute left-1/2 top-[8rem] z-10 flex h-[9.5rem] w-[9.5rem] -translate-x-1/2 items-center justify-center sm:h-[11rem] sm:w-[11rem]">
        <svg
          className="landing-seal-spin absolute inset-0 h-full w-full"
          viewBox="0 0 200 200"
          aria-hidden
        >
          <defs>
            <path id="stoa-seal-ring" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
          </defs>
          <text
            className="fill-[var(--ink)]"
            style={{ fontFamily: "var(--font-display)", fontSize: "10.5px", letterSpacing: "5px" }}
          >
            <textPath href="#stoa-seal-ring" startOffset="0">
              STOA · VERIFIED RESEARCH · LOCKED AT PUBLISH · GRADED BY THE MARKET ·
            </textPath>
          </text>
        </svg>
        <div className="relative px-3 text-center">
          <p className="font-display text-[10px] uppercase tracking-[0.28em] text-text-faint">
            Seal of record
          </p>
          <p className="font-display mt-1 text-3xl font-semibold tracking-tight text-text sm:text-4xl">
            Stoa
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-text-mute">Graded forever</p>
        </div>
      </div>

      {featured.map((call, i) => {
        const slot = SLOTS[i];
        if (!slot) return null;
        return (
          <div
            key={call.id}
            data-float-card
            className={cn("absolute z-[1] transition-transform duration-[var(--dur-1)] ease-[var(--ease-out)]", slot.className)}
          >
            <div className={slot.tilt}>
              <div className={slot.float}>
                <LandingCallChip call={call} size="md" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
