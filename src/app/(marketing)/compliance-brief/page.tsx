import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LegalPageShell } from "@/components/legal/legal-page-shell";
import { renderLegalMarkdown } from "@/lib/legal/render-markdown";

export const metadata: Metadata = {
  title: "Legal & Compliance Brief for Counsel",
  robots: { index: false, follow: false },
};

async function loadBrief(): Promise<string> {
  const filePath = path.join(process.cwd(), "docs/LEGAL_COMPLIANCE_BRIEF.md");
  return readFile(filePath, "utf8");
}

export default async function ComplianceBriefPage() {
  const markdown = await loadBrief();
  const html = renderLegalMarkdown(markdown);

  return (
    <LegalPageShell title="Legal & Compliance Brief for Counsel">
      <p className="t-body text-text-mute">
        Internal briefing document for retained counsel — not legal advice and not drafted legal
        text. Hand this to US and Israeli counsel to start informed drafting.
      </p>
      <div
        className="legal-brief-prose"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: trusted repo markdown, escaped in renderer
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </LegalPageShell>
  );
}
