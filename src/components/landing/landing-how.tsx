import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "The call locks",
    body: "An analyst publishes with a ticker, direction, target, and horizon. The entry price seals at publish and can never be edited.",
  },
  {
    n: "02",
    title: "The market grades",
    body: "When the horizon closes, the outcome resolves against real prices. Hit or miss, it lands on the permanent record.",
  },
  {
    n: "03",
    title: "The score moves",
    body: "Every resolution updates the analyst's Track Score, a 0 to 100 track-record grade you can check before you trust a word.",
  },
] as const;

/**
 * The trust loop, told as the ordered sequence it actually is. Each step inks
 * in as the reader scrolls it into view -- scrubbed by their own scroll
 * position (scroll-timeline, like a scrollbar), never fired by it, and fully
 * visible in browsers without scroll-timeline support.
 */
export function LandingHow() {
  return (
    <section className="border-t border-border">
      <div className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-text sm:text-3xl" style={{ textWrap: "balance" }}>
          How Stoa works
        </h2>
        <p className="mt-3 max-w-xl text-base leading-relaxed text-text-mute">
          One loop, enforced by the database and graded by the market. No edits, no deletions,
          no exceptions.
        </p>

        <ol className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-8">
          {STEPS.map((step) => (
            <li key={step.n} className="scrub-in flex flex-col gap-3 border-t-2 border-ink pt-5">
              <span className="num text-sm font-semibold tracking-[0.18em] text-[var(--accent)]">
                {step.n}
              </span>
              <h3 className="font-display text-xl font-semibold text-text">{step.title}</h3>
              <p className="text-sm leading-relaxed text-text-mute">{step.body}</p>
            </li>
          ))}
        </ol>

        <p className="t-meta mt-10">
          The full grading math is public.{" "}
          <Link href="/scoring" className="underline transition-colors hover:text-text">
            Read the scoring methodology
          </Link>
        </p>
      </div>
    </section>
  );
}
