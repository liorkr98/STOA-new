import type { Metadata } from "next";
import { LegalSection } from "@/components/legal/legal-page-shell";
import { EXTENSION_PRIVACY_CONTENT } from "@/lib/legal/extension-privacy";

/** Not linked from the site and not in the sitemap until legal review is done. */
export const metadata: Metadata = {
  title: "Stoa Interest Cart extension: privacy",
  robots: { index: false, follow: false },
};

export default function ExtensionPrivacyPage() {
  return (
    <div className="mx-auto max-w-[var(--w-reading)] gutter-x py-16">
      <div role="note" className="mb-8 rounded-inner border border-[var(--notice-edge)] bg-[var(--notice-soft)] px-4 py-3 text-body text-text">
        <strong>DRAFT – pending legal review.</strong> This page is not final and is not linked from Stoa yet.
      </div>
      <h1 className="t-headline">Stoa Interest Cart: privacy</h1>
      <p className="t-body mt-3 text-text-mute">For the Chrome extension that works with YouTube. Last updated 28 October 2026.</p>
      <div className="mt-8 flex flex-col gap-6">
        {EXTENSION_PRIVACY_CONTENT.map((section) => (
          <LegalSection key={section.title} {...section} />
        ))}
      </div>
    </div>
  );
}
