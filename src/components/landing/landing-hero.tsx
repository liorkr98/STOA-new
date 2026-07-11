"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Clock, RotateCcw, Target } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { SealStamp } from "@/components/ui/seal-stamp";
import { DirectionTag, GradeTag } from "@/components/ui/tag";
import { cn } from "@/lib/design/cn";

type Stage = "drafted" | "locked" | "resolved";

const LOCK_AT = 900;
const RESOLVE_AT = 2600;

/**
 * The landing hero demos the whole trust loop on one illustrative call: it
 * locks (the seal ceremony), then the market grades it. Plays once per visit;
 * a first-time marketing surface is the rare moment that has earned ceremony
 * (MOTION.md frequency rule). Reduced motion lands on the finished state.
 */
export function LandingHero() {
  const [stage, setStage] = useState<Stage>("drafted");
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStage("resolved");
      return;
    }
    setStage("drafted");
    const lock = window.setTimeout(() => setStage("locked"), LOCK_AT);
    const resolve = window.setTimeout(() => setStage("resolved"), RESOLVE_AT);
    return () => {
      window.clearTimeout(lock);
      window.clearTimeout(resolve);
    };
  }, [run]);

  const resolved = stage === "resolved";

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
      <div className="fade-up">
        <p className="t-eyebrow text-text-mute">The analyst ledger</p>
        <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-text sm:text-5xl lg:text-6xl" style={{ textWrap: "balance" }}>
          Every call on the record. Forever.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-text-mute">
          Independent analysts publish price calls that lock at publish, get graded by the
          market, and build a public Track Score nobody can argue with. Not even them.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/sign-up" className={buttonClass("primary", "lg")}>
            Join Stoa
          </Link>
          <Link href="/discover" className={buttonClass("secondary", "lg")}>
            Browse the research
          </Link>
        </div>
        <p className="t-meta mt-6">
          Free to read. Analysts set their own prices; the ledger is public either way.
        </p>
      </div>

      <div className="fade-up" style={{ animationDelay: "0.12s" }}>
        <div className="ledger-card relative p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="num text-lg font-semibold tracking-tight">NVDA</span>
              <DirectionTag direction="long" />
            </div>
            <div className="flex h-8 items-center gap-2">
              {resolved ? (
                <GradeTag outcome="hit" />
              ) : (
                <GradeTag outcome="open" />
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            <Field label="Entry" value="$202.78" />
            <Field
              label="Target"
              value="$246.00"
              icon={<Target size={12} strokeWidth={2.5} />}
              trailing={
                stage !== "drafted" ? (
                  <SealStamp
                    key={`${stage}-${run}`}
                    status={resolved ? "hit" : "locked"}
                    date={new Date()}
                    size="sm"
                    animate={stage === "locked"}
                    animateOnView={resolved}
                  />
                ) : (
                  <span className="inline-block" style={{ width: 32, height: 32 }} />
                )
              }
            />
            <Field label={resolved ? "Resolved" : "Now"} value={resolved ? "$247.10" : "$203.42"} />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
            <span className="t-meta inline-flex items-center gap-1">
              <Clock size={13} strokeWidth={2.5} />
              90d horizon
            </span>
            <span
              className={cn(
                "num inline-flex items-center gap-0.5 text-sm font-semibold",
                resolved ? "fade-up text-[var(--up)]" : "text-text-mute",
              )}
              style={resolved ? { "--fade-y": "4px" } as React.CSSProperties : undefined}
            >
              {resolved && <ArrowUpRight size={14} strokeWidth={2.5} />}
              {resolved ? "+21.9%" : "Pending"}
            </span>
          </div>

          {resolved && (
            <div className="fade-up mt-2 flex items-center justify-between text-xs" style={{ "--fade-y": "4px" } as React.CSSProperties}>
              <span className="t-meta">vs S&amp;P +1.4%</span>
              <span className="num font-medium" style={{ color: "var(--up)" }}>
                +20.5% alpha
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <p className="t-meta">Illustrative call. Real ones live in the ledger.</p>
          {resolved && (
            <button
              type="button"
              onClick={() => setRun((n) => n + 1)}
              className="focus-ring inline-flex items-center gap-1 rounded-[var(--radius-btn)] px-1.5 py-0.5 text-xs text-text-faint transition-colors hover:text-text"
            >
              <RotateCcw size={12} strokeWidth={2.5} />
              Replay
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  icon,
  trailing,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="t-eyebrow inline-flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="num text-sm font-medium">{value}</span>
        {trailing}
      </span>
    </div>
  );
}
