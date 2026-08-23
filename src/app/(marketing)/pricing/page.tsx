import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/button";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[var(--w-reading)] gutter-x py-16">
      <h1 className="t-h1">Pricing</h1>
      <p className="t-body mt-3">
        Browsing is free. Analysts set their own prices; Stoa takes a flat 10% of what they earn.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="t-h3">For investors</h2>
          <p className="t-body mt-2">
            Free to browse, follow analysts, and read free posts. Pay only when you subscribe to an
            analyst or unlock a paid report.
          </p>
          <Link href="/sign-up" className={buttonClass("primary", "md", "mt-5")}>
            Join free
          </Link>
        </div>
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <h2 className="t-h3">For analysts</h2>
          <p className="t-body mt-2">
            Set monthly subscriptions ($5 to $200) and per-report prices ($1 to $50). You keep 90%
            of every transaction and own your subscriber list.
          </p>
          <Link href="/become-analyst" className={buttonClass("secondary", "md", "mt-5")}>
            Start publishing
          </Link>
        </div>
      </div>
    </div>
  );
}
