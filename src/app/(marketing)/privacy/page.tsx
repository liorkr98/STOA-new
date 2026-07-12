import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { PRIVACY_CONTENT } from "@/lib/legal/content";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      {PRIVACY_CONTENT.map((section) => (
        <LegalSection key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
