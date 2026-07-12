import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { LandingCallChip } from "@/components/landing/landing-call-chip";
import type { ResolvedCall } from "@/lib/db/predictions";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/* Desk positions for the scattered ledger slips: slight rotations, no two
 * alike, like graded calls dropped on a notary's desk. */
const SCATTER = [
  { className: "right-[6%] top-0 w-60 rotate-[1.6deg]", delay: 0.1, drift: "0s" },
  { className: "right-[42%] top-[42%] w-52 -rotate-[2deg]", delay: 0.18, drift: "1.3s" },
  { className: "right-0 top-[68%] w-56 rotate-[0.8deg]", delay: 0.26, drift: "2.6s" },
] as const;

/**
 * The landing masthead: the day's date set like a broadsheet folio, the
 * thesis in large Fraunces, and real graded calls from the ledger drifting
 * beside it. Everything on the desk is a genuine row -- hits and misses.
 */
export function LandingHero({ calls }: { calls: ResolvedCall[] }) {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = MONTHS[now.getMonth()];
  const year = String(now.getFullYear());
  const scattered = calls.slice(0, SCATTER.length);

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-10 sm:pt-14">
      <div className="fade-up flex items-start justify-between border-b-2 border-ink pb-4">
        <span className="num text-sm font-semibold leading-tight tracking-[0.08em]">
          {day}
          <br />
          <span className="text-text-faint">{month}</span>
        </span>
        <span className="t-eyebrow mt-1 hidden text-text-mute sm:block">
          The analyst ledger &middot; graded by the market
        </span>
        <span className="num text-sm font-semibold leading-tight tracking-[0.08em] text-right">
          {year.slice(0, 2)}
          <br />
          <span className="text-text-faint">{year.slice(2)}</span>
        </span>
      </div>

      <div className="grid gap-12 pt-12 lg:grid-cols-[1.15fr_1fr] lg:gap-8">
        <div className="fade-up" style={{ animationDelay: "0.06s" }}>
          <h1
            className="font-display text-[clamp(2.75rem,5.6vw,4.75rem)] font-semibold uppercase leading-[1.02] tracking-[-0.015em] text-text"
            style={{ textWrap: "balance" }}
          >
            Every call on the record. Forever.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-mute">
            Independent analysts publish price calls that lock at publish, get graded by the
            market, and build a public Track Score nobody can argue with. Not even them.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/sign-up" className={buttonClass("primary", "lg")}>
              Join Stoa
            </Link>
            <Link href="/dispatch" className={buttonClass("secondary", "lg")}>
              Read today&apos;s dispatch
            </Link>
          </div>
          <p className="t-meta mt-6">
            Free to read. Analysts set their own prices; the ledger is public either way. Or{" "}
            <Link href="/discover" className="underline hover:no-underline">
              browse the research
            </Link>
            .
          </p>
        </div>

        {scattered.length > 0 && (
          <div className="relative hidden min-h-[26rem] lg:block" aria-label="Recently graded calls">
            {scattered.map((call, i) => (
              <div
                key={call.id}
                className={`fade-up absolute ${SCATTER[i].className}`}
                style={{ animationDelay: `${SCATTER[i].delay}s` }}
              >
                <div className="ledger-float" style={{ animationDelay: SCATTER[i].drift }}>
                  <LandingCallChip call={call} size={i === 0 ? "lg" : "md"} withSeal={i === 0} />
                </div>
              </div>
            ))}
          </div>
        )}

        {scattered.length > 0 && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:hidden">
            {scattered.slice(0, 2).map((call, i) => (
              <LandingCallChip key={call.id} call={call} withSeal={i === 0} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
