import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SentryExampleContent } from "./sentry-example-content";

export const metadata: Metadata = { title: "Sentry example" };

export default function SentryExamplePage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <div className="mx-auto max-w-xl px-5 py-16">
      <h1 className="t-h1">Sentry example</h1>
      <p className="t-body mt-2 text-text-mute">
        Development only. Click the button below to send a test error to Sentry.
      </p>
      <SentryExampleContent />
    </div>
  );
}
