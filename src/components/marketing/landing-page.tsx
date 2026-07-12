import { LandingHero, type ShowcaseCall } from "@/components/marketing/landing-hero";
import { LandingSections } from "@/components/marketing/landing-sections";
import type { DispatchPayload } from "@/lib/dispatch/types";

function storiesToShowcase(dispatch: DispatchPayload): ShowcaseCall[] {
  const stories = [
    ...(dispatch.lead ? [dispatch.lead] : []),
    ...dispatch.secondary,
    ...dispatch.wire,
  ].slice(0, 5);

  return stories.map((s) => {
    const ticker = (s.report.ticker ?? s.prediction?.ticker ?? "-").toUpperCase();
    const direction = s.prediction?.direction === "short" ? "short" : "long";
    const showTarget = s.report.access === "free" && s.prediction?.target_price != null;
    const ret = s.prediction?.return_pct;
    return {
      id: s.report.id,
      ticker,
      direction,
      title: s.headline,
      score: s.author.score || null,
      targetLabel: showTarget ? `Target $${s.prediction!.target_price!.toFixed(0)}` : null,
      deltaLabel:
        ret == null
          ? null
          : `${ret >= 0 ? "+" : "−"}${Math.abs(ret).toFixed(1)}%`,
      href: `/report/${s.report.id}`,
    };
  });
}

export function LandingPage({ dispatch }: { dispatch: DispatchPayload }) {
  const calls = storiesToShowcase(dispatch);
  return (
    <div className="landing-page bg-bg text-text">
      <LandingHero calls={calls.length >= 3 ? calls : undefined} />
      <LandingSections />
    </div>
  );
}
