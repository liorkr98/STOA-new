import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/legal/legal-page-shell";
import { COOKIES_CONTENT } from "@/lib/legal/content";

export const metadata: Metadata = { title: "Cookie Policy" };

export default function CookiesPage() {
  return (
    <LegalPageShell title="Cookie Policy">
      {COOKIES_CONTENT.map((section) => (
        <LegalSection key={section.title} {...section} />
      ))}
    </LegalPageShell>
  );
}
