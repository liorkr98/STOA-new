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
        <Section title="3. Three honest pillars">
          The 0-100 score blends a sample-adjusted win rate (Wilson lower bound), profit factor
          (average win divided by average loss), and alpha versus the benchmark. It is mapped to a
          600-1400 rating for display.
        </Section>
        <Section title="4. Tiers reward proven edge">
          Tiers from Building to Legend require both a minimum score and a minimum number of
          resolved calls, so a tiny lucky streak cannot fake a reputation.
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
