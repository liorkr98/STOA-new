import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl px-5 py-16">
      <h1 className="t-h1">Privacy Policy</h1>
      <p className="t-body mt-4">
        This is a placeholder for Stoa&apos;s Privacy Policy. We store the account details you
        provide (email, display name) and the activity needed to run the marketplace (follows,
        subscriptions, purchases, and published work).
      </p>
      <p className="t-body mt-4">
        We do not sell your personal data. Replace this copy with your reviewed privacy policy
        before launch.
      </p>
    </div>
  );
}
