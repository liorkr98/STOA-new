import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { CREATOR_TERMS_CONTENT } from "@/lib/legal/content";

export const metadata: Metadata = { title: "Creator Terms" };

export default function CreatorTermsPage() {
  return (
    <LegalPageShell title="Terms for Analysts & Creators">
      {CREATOR_TERMS_CONTENT.map((section) => (
        <LegalSection key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
