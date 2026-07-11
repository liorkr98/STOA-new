import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { TERMS_CONTENT } from "@/lib/legal/content";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPageShell title="Terms of Service">
      {TERMS_CONTENT.map((section) => (
        <LegalSection key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
