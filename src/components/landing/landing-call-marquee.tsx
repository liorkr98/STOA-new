import { LandingCallChip } from "@/components/landing/landing-call-chip";
import type { ResolvedCall } from "@/lib/db/predictions";
import { cn } from "@/lib/design/cn";

/**
 * Full-bleed horizontal line of graded calls (Dropship-style marquee).
 * Edge fade via mask; infinite scroll paused under prefers-reduced-motion.
 * Real ledger rows only -- duplicated only enough to loop cleanly.
 */
export function LandingCallMarquee({
  calls,
  direction = "left",
  durationSec = 42,
  className,
}: {
  calls: ResolvedCall[];
  direction?: "left" | "right";
  durationSec?: number;
  className?: string;
}) {
  if (calls.length === 0) return null;

  // Enough chips that one set is wider than the viewport on most screens.
  const base = [...calls];
  while (base.length < 8) base.push(...calls);
  const loop = [...base, ...base];

  return (
    <div className={cn("landing-marquee", className)} aria-hidden>
      <div
        className={cn(
          "landing-marquee-track",
          direction === "right" && "landing-marquee-track--reverse",
        )}
        style={{ animationDuration: `${durationSec}s` }}
      >
        {loop.map((call, i) => (
          <div key={`${call.id}-${i}`} className="w-[15.5rem] shrink-0 sm:w-[17rem]">
            <LandingCallChip call={call} size="md" />
          </div>
        ))}
      </div>
    </div>
  );
}
