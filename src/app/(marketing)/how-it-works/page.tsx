import type { Metadata } from "next";

export const metadata: Metadata = { title: "How scoring works" };

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="t-h1">How scoring works</h1>
      <p className="t-body mt-3">
        Every research report and BUY/SELL call carries an investment card: a ticker, a direction,
        an optional target, and a timeframe. That card is what gets scored.
      </p>

      <div className="mt-10 flex flex-col gap-8">
        <Section title="1. Entry locks at publish">
          The moment a call goes live, Stoa records the entry price from the market feed. The
          analyst cannot edit it afterward, so there is no hindsight.
        </Section>
        <Section title="2. The market resolves it">
          When the timeframe ends, Stoa pulls the closing price and the S&amp;P 500 return over the
          same window. The call is graded Hit, Near, Partial, or Miss.
        </Section>
        <Section title="3. Four honest pillars">
          The 0-100 Track Score blends a time-weighted win rate (Hit = full credit, Near = half),
          profit factor, alpha versus the S&amp;P 500, and a consistency check for losing
          streaks. Recent calls count more than old ones.
        </Section>
        <Section title="4. Sample size keeps scores honest">
          The Track Score discounts small samples, so a tiny lucky streak cannot fake a
          reputation. Under 10 resolved calls the score is marked provisional wherever it appears.
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="t-h3">{title}</h2>
      <p className="t-body mt-2">{children}</p>
    </section>
  );
}
