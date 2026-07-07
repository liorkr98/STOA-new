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
    title: "The moat moves",
    body: "Every resolution updates the analyst's MOAT score, a 0 to 100 track-record grade you can check before you trust a word.",
  },
] as const;

export function DispatchHowItWorks() {
  return (
    <section className="dispatch-section">
      <h2 className="dispatch-kicker">
        <span>How Stoa works</span>
      </h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-3">
        {STEPS.map((step) => (
          <div key={step.n} className="flex flex-col gap-2">
            <span className="num text-xs font-semibold tracking-[0.18em] text-[var(--accent)]">
              {step.n}
            </span>
            <h3 className="font-display text-base font-semibold text-text">{step.title}</h3>
            <p className="text-sm leading-relaxed text-text-mute">{step.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
