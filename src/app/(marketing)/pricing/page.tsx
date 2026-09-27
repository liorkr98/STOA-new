import Link from "next/link";
import type { Metadata } from "next";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-[var(--w-reading)] gutter-x py-16">
      <h1 className="t-headline">Pricing</h1>
      <p className="t-body mt-3">
        Browsing is free. Analysts set their own prices; Stoa takes a flat 10% of what they earn.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        <Card className="p-6">
          <h2 className="t-title">For investors</h2>
          <p className="t-body mt-2">
            Free to browse, follow analysts, and read free posts. Pay only when you subscribe to an
            analyst or unlock a paid report.
          </p>
          <Link href="/sign-up" className={buttonClass("ink", "md", "mt-5")}>
            Join free
          </Link>
        </Card>
        <Card className="p-6">
          <h2 className="t-title">For analysts</h2>
          <p className="t-body mt-2">
            Set monthly subscriptions ($5 to $200) and per-report prices ($1 to $50). You keep 90%
            of every transaction and own your subscriber list.
          </p>
          <Link href="/become-analyst" className={buttonClass("ghost", "md", "mt-5")}>
            Start publishing
          </Link>
        </Card>
      </div>
    </div>
  );
}
