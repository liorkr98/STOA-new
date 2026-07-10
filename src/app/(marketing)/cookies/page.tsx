import type { Metadata } from "next";
import { LegalPageShell, PlaceholderSection } from "@/components/legal/legal-page-shell";
import { PLACEHOLDER_SECTIONS } from "@/lib/legal/constants";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalPageShell title="Cookie Policy">
      {PLACEHOLDER_SECTIONS.cookies.map((section) => (
        <PlaceholderSection key={section} title={section} />
      ))}
    </LegalPageShell>
  );
}
