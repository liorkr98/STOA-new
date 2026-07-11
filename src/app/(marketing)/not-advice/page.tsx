import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { NOT_ADVICE_CONTENT } from "@/lib/legal/content";

export const metadata: Metadata = { title: "Not Investment Advice" };

export default function NotAdvicePage() {
  return (
    <LegalPageShell title="Not Investment Advice">
      <p className="t-body text-text-mute">
        Stoa is a research marketplace. Nothing on this platform is investment, tax, or legal
        advice.
      </p>
      {NOT_ADVICE_CONTENT.map((section) => (
        <LegalSection key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
