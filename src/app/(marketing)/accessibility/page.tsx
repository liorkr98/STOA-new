import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Accessibility" };

export default function AccessibilityPage() {
  return (
    <LegalPageShell title="Accessibility Statement">
      <section>
        <h2 className="t-h3">Our commitment</h2>
        <p className="t-body mt-2 text-text-mute">
          Stoa aims to be usable by people with a wide range of abilities. We follow WCAG 2.1 Level
          AA where practical and test with keyboard navigation, screen readers, and automated
          accessibility tools.
        </p>
      </section>

      <section>
        <h2 className="t-h3">What we build for</h2>
        <ul className="t-body mt-2 list-disc space-y-2 pl-5 text-text-mute">
          <li>Keyboard-operable navigation, forms, and dialogs</li>
          <li>Visible focus indicators on interactive elements</li>
          <li>Semantic headings and skip-to-content links on every page</li>
          <li>Text alternatives for icon-only controls</li>
          <li>Reduced-motion support via <code className="text-xs">prefers-reduced-motion</code></li>
          <li>Form errors linked to inputs with accessible descriptions</li>
        </ul>
      </section>

      <section>
        <h2 className="t-h3">Known limitations</h2>
        <p className="t-body mt-2 text-text-mute">
          Chart drawing tools in the compose editor are primarily pointer-driven; keyboard
          alternatives are planned. Some third-party embeds (TradingView charts) follow their own
          accessibility profiles.
        </p>
      </section>

      <section>
        <h2 className="t-h3">Report an issue</h2>
        <p className="t-body mt-2 text-text-mute">
          If you encounter a barrier on Stoa, contact us at{" "}
          <a href="mailto:accessibility@stoa.app" className="text-accent underline">
            accessibility@stoa.app
          </a>{" "}
          with the page URL and a description of the problem. We respond to accessibility feedback
          as a priority.
        </p>
        <p className="t-body mt-2 text-text-mute">
          See also our{" "}
          <Link href="/privacy" className="text-accent underline">
            Privacy Policy
          </Link>{" "}
          for how we handle personal data.
        </p>
      </section>
    </LegalPageShell>
  );
}
