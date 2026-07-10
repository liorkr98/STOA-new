import type { Metadata } from "next";
import { LegalPageShell, PlaceholderSection } from "@/components/legal/legal-page-shell";
import { PLACEHOLDER_SECTIONS } from "@/lib/legal/constants";

export const metadata: Metadata = { title: "Creator Terms" };

export default function CreatorTermsPage() {
  return (
    <LegalPageShell title="Terms for Analysts & Creators">
      {PLACEHOLDER_SECTIONS.terms_creator.map((section) => (
        <PlaceholderSection key={section} title={section} />
      ))}
    </LegalPageShell>
  );
}
