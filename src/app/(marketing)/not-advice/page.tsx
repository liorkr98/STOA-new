import type { Metadata } from "next";
import { LegalPageShell, PlaceholderSection } from "@/components/legal/legal-page-shell";
import { PLACEHOLDER_SECTIONS } from "@/lib/legal/constants";

export const metadata: Metadata = { title: "Not Investment Advice" };

export default function NotAdvicePage() {
  return (
    <LegalPageShell title="Not Investment Advice">
      <p className="t-body text-text-mute">
        Stoa is a research marketplace. Nothing on this platform is investment, tax, or legal
        advice.
      </p>
      {PLACEHOLDER_SECTIONS.not_advice.map((section) => (
        <PlaceholderSection key={section} title={section} />
      ))}
    </LegalPageShell>
  );
}
