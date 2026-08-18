import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { LandingCallChip } from "@/components/landing/landing-call-chip";
import { LandingCallMarquee } from "@/components/landing/landing-call-marquee";
import { LandingFloatStage } from "@/components/landing/landing-float-stage";
import type { ResolvedCall } from "@/lib/db/predictions";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Landing masthead: Dropship call river up top + 21st beam/seal/float stage.
 * Stoa tokens only; real graded calls; slogan is fixed product line.
 */
export function LandingHero({ calls }: { calls: ResolvedCall[] }) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = MONTHS[now.getMonth()];
  const year = String(now.getFullYear());

  const mid = Math.ceil(calls.length / 2);
  const rowA = calls.slice(0, mid);
  const rowB = calls.slice(mid);
  const topRow = rowA.length >= 3 ? rowA : calls;
  const bottomRow = rowB.length >= 3 ? rowB : [...calls].reverse();
  const floatCalls = calls.slice(0, 5);

  return (
    <section className="relative overflow-hidden pb-16 pt-10 sm:pb-24 sm:pt-14">
      <div className="fade-up mx-auto flex max-w-6xl items-start justify-between border-b-2 border-ink px-5 pb-4">
        <span className="num text-sm font-semibold leading-tight tracking-[0.08em]">
          {day}
          <br />
          <span className="text-text-faint">{month}</span>
        </span>
        <span className="t-eyebrow mt-1 hidden text-text-mute sm:block">
          The analyst ledger &middot; graded by the market
        </span>
        <span className="num text-right text-sm font-semibold leading-tight tracking-[0.08em]">
          {year.slice(0, 2)}
          <br />
          <span className="text-text-faint">{year.slice(2)}</span>
        </span>
      </div>

      {/* Upper Dropship river — moving calls first in the visual field */}
      {calls.length > 0 && (
        <div className="relative mt-8 sm:mt-10" aria-label="Recently graded calls">
          <LandingCallMarquee calls={topRow} direction="left" durationSec={42} />
          <LandingCallMarquee
            calls={bottomRow}
            direction="right"
            durationSec={50}
            className="mt-3"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 top-1/2 bg-[linear-gradient(to_bottom,transparent,color-mix(in_srgb,var(--paper)_85%,transparent))]"
          />
        </div>
      )}

      {/* Centered thesis */}
      <div className="relative z-10 mx-auto -mt-4 flex max-w-3xl flex-col items-center px-5 text-center sm:-mt-6">
        <p className="fade-up inline-flex items-center gap-2 rounded-[var(--r-tag)] border border-border bg-surface px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-text-mute">
          <span className="pulse-dot h-1.5 w-1.5 rounded-[1px] bg-[var(--ink)]" aria-hidden />
          Locked calls · graded forever
        </p>

        <h1
          className="fade-up mt-6 font-display text-[clamp(2.75rem,6vw,4.75rem)] font-semibold leading-[1.02] tracking-[-0.02em] text-text"
          style={{ animationDelay: "0.04s", textWrap: "balance" }}
        >
          For Readers,{" "}
          <span className="font-medium italic text-text-mute">not followers</span>
        </h1>

        <p
          className="fade-up mt-5 max-w-xl text-base leading-relaxed text-text-mute sm:text-lg"
          style={{ animationDelay: "0.08s" }}
        >
          Independent analysts, read on their record. Every call locks at publish, the market
          grades it when the horizon closes, and the outcome stays public. Hits and misses both.
        </p>

        <div
          className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.12s" }}
        >
          <Link href="/discover" className={buttonClass("primary", "lg")}>
            Browse the research
            <ArrowRight size={16} aria-hidden />
          </Link>
          <Link href="/scoring" className={buttonClass("secondary", "lg")}>
            How calls are graded
          </Link>
        </div>

        <p className="t-meta fade-up mt-5" style={{ animationDelay: "0.16s" }}>
          Or{" "}
          <Link href="/dispatch" className="underline hover:no-underline">
            read today&apos;s dispatch
          </Link>
          {" · "}
          <Link href="/sign-up" className="underline hover:no-underline">
            join Stoa
          </Link>
        </p>

        {calls.length > 0 && (
          <p
            className="fade-up mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.18em] text-text-faint"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="num">{calls.length}+ recent graded calls</span>
            <span aria-hidden className="hidden h-1 w-1 bg-text-faint sm:inline-block" />
            <span>Hits and misses stay on the record</span>
          </p>
        )}
      </div>

      {/* Beam + seal + floating tilted cards */}
      {floatCalls.length > 0 ? (
        <div className="mt-10 px-5 sm:mt-14">
          <LandingFloatStage calls={floatCalls} />
        </div>
      ) : (
        <div className="mx-auto mt-12 flex flex-col items-center px-5">
          <div
            aria-hidden
            className="h-14 w-px bg-[linear-gradient(to_bottom,transparent,var(--ink))]"
          />
          <div className="landing-hero-seal mt-2 flex h-24 w-24 items-center justify-center">
            <span className="font-display text-2xl font-semibold tracking-tight">Stoa</span>
          </div>
        </div>
      )}

      {calls.length > 0 && (
        <div className="mx-auto mt-8 grid max-w-6xl grid-cols-1 gap-3 px-5 sm:hidden">
          {calls.slice(0, 4).map((call, i) => (
            <LandingCallChip key={call.id} call={call} withSeal={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
