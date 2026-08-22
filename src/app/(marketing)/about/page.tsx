import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-[var(--w-reading)] px-5 py-16">
      <h1 className="t-h1">About Stoa</h1>
      <p className="t-body mt-4">
        Stoa is a marketplace for independent stock research. Analysts publish their work and set
        their own pricing; investors browse verified track records and pay for the voices they
        trust.
      </p>
      <p className="t-body mt-4">
        The name comes from the ancient Athenian Stoa, a public colonnade where people gathered to
        argue ideas and do business. That is the spirit here: open debate, real accountability, and
        a permanent record of who was right.
      </p>
      <p className="t-body mt-4">
        Unlike legacy research platforms, analysts on Stoa own their subscriber relationships, and
        every prediction is scored into a public, non-transferable track record. If an analyst
        leaves, their score stays.
      </p>
    </div>
  );
}
