import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { LandingCallChip } from "@/components/landing/landing-call-chip";
import { LandingCallMarquee } from "@/components/landing/landing-call-marquee";
import type { ResolvedCall } from "@/lib/db/predictions";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * Landing masthead: broadsheet folio, centered thesis, and two live lines of
 * graded calls scrolling left/right (Dropship river, Stoa ledger skin).
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

      {/* Thesis first, then the river of calls under the beam */}
      <div className="relative z-10 mx-auto mt-12 flex max-w-3xl flex-col items-center px-5 text-center sm:mt-16">
        <p className="fade-up inline-flex items-center gap-2 rounded-[var(--r-tag)] border border-border bg-surface px-3 py-1 text-xs font-medium text-text-mute">
          <span className="pulse-dot h-1.5 w-1.5 rounded-[1px] bg-[var(--ink)]" aria-hidden />
          Locked calls. Graded forever.
        </p>

        <h1
          className="fade-up mt-5 font-display text-[clamp(2.6rem,5.5vw,4.5rem)] font-semibold leading-[1.05] tracking-[-0.02em] text-text"
          style={{ animationDelay: "0.04s", textWrap: "balance" }}
        >
          For Readers,{" "}
          <span className="text-text-mute">not followers</span>
        </h1>

        <p
          className="fade-up mt-5 max-w-xl text-base leading-relaxed text-text-mute sm:text-lg"
          style={{ animationDelay: "0.08s" }}
        >
          Independent analysts publish price calls that lock at publish, get graded by the market,
          and build a public Track Score. Trust the record, not the feed.
        </p>

        <div
          className="fade-up mt-8 flex flex-wrap items-center justify-center gap-3"
          style={{ animationDelay: "0.12s" }}
        >
          <Link href="/sign-up" className={buttonClass("primary", "lg")}>
            Join Stoa
          </Link>
          <Link href="/dispatch" className={buttonClass("secondary", "lg")}>
            Read today&apos;s dispatch
          </Link>
        </div>

        <p className="t-meta fade-up mt-5" style={{ animationDelay: "0.16s" }}>
          Free to read. Or{" "}
          <Link href="/discover" className="underline hover:no-underline">
            browse the research
          </Link>
          .
        </p>
      </div>

      {/* Beam into the seal, then scrolling call lines */}
      {calls.length > 0 && (
        <div className="relative mt-2" aria-label="Recently graded calls">
          <div className="relative z-10 mx-auto flex flex-col items-center">
            <div
              aria-hidden
              className="landing-hero-beam h-14 w-px bg-[linear-gradient(to_bottom,transparent,var(--border-strong),var(--ink))] sm:h-20"
            />
            <div
              aria-hidden
              className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] border-2 border-[var(--ink)] bg-paper sm:h-14 sm:w-14"
            >
              <span className="font-display text-lg font-semibold tracking-[0.12em] text-text">
                S
              </span>
            </div>
          </div>

          <div className="relative -mt-6 space-y-3 pt-10 sm:-mt-4 sm:pt-12">
            <LandingCallMarquee calls={topRow} direction="left" durationSec={48} />
            <LandingCallMarquee calls={bottomRow} direction="right" durationSec={56} />
          </div>
        </div>
      )}

      {calls.length === 0 && (
        <div className="mx-auto mt-10 flex flex-col items-center px-5">
          <div
            aria-hidden
            className="landing-hero-beam h-14 w-px bg-[linear-gradient(to_bottom,transparent,var(--border-strong),var(--ink))]"
          />
          <div
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-card)] border-2 border-[var(--ink)] bg-paper"
          >
            <span className="font-display text-lg font-semibold tracking-[0.12em] text-text">S</span>
          </div>
        </div>
      )}

      {/* Mobile: static chips; marquees hide below lg */}
      {calls.length > 0 && (
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-3 px-5 sm:hidden">
          {calls.slice(0, 4).map((call, i) => (
            <LandingCallChip key={call.id} call={call} withSeal={i === 0} />
          ))}
        </div>
      )}
    </section>
  );
}
