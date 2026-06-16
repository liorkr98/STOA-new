import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="t-h1">Terms of Service</h1>
      <p className="t-body mt-4">
        This is a placeholder for Stoa&apos;s Terms of Service. Stoa is a research marketplace, not a
        broker or investment adviser. Content on the platform is the opinion of independent
        analysts and is not financial advice.
      </p>
      <p className="t-body mt-4">
        By using Stoa you agree that all investment decisions are your own. Track records describe
        past performance, which does not guarantee future results. Replace this copy with your
        reviewed legal terms before launch.
      </p>
    </div>
  );
}
