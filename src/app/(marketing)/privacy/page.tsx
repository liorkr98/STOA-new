import type { Metadata } from "next";
import { LegalPageShell, PlaceholderSection } from "@/components/legal/legal-page-shell";
import { PLACEHOLDER_SECTIONS } from "@/lib/legal/constants";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPageShell title="Privacy Policy">
      {PLACEHOLDER_SECTIONS.privacy.map((section) => (
        <PlaceholderSection key={section} title={section} />
      ))}
    </LegalPageShell>
  );
}
