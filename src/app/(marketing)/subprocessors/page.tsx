import type { Metadata } from "next";
import { LegalPageShell } from "@/components/legal/legal-page-shell";

export const metadata: Metadata = { title: "Subprocessors" };

const SUBPROCESSORS = [
  {
    name: "PayPal",
    purpose: "Payments, creator payouts, subscription billing",
    data: "Account identifiers, transaction amounts, payout metadata",
  },
  {
    name: "Supabase",
    purpose: "Database, authentication, file storage",
    data: "Account data, published content, session tokens",
  },
  {
    name: "DeepSeek",
    purpose: "AI-assisted fact-checking and compose tools (when enabled)",
    data: "Report excerpts submitted for analysis",
  },
  {
    name: "OpenAI",
    purpose: "Text-to-speech for audio briefs (optional feature)",
    data: "Script text for synthesis",
  },
  {
    name: "Yahoo Finance (via yahoo-finance2)",
    purpose: "Market quotes, fundamentals, and reference data",
    data: "Ticker symbols queried; no user PII sent",
  },
  {
    name: "Bunny.net (Bunny Stream)",
    purpose: "Video hosting, encoding, and delivery",
    data: "Uploaded video assets linked to reports; viewer IP at CDN layer",
  },
  {
    name: "Vercel",
    purpose: "Application hosting and edge delivery",
    data: "Request logs, IP addresses at infrastructure layer",
  },
] as const;

export default function SubprocessorsPage() {
  return (
    <LegalPageShell title="Subprocessors">
      <p className="t-body text-text-mute">
        Third parties that process data on Stoa&apos;s behalf. This list will be updated when
        vendors change.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="py-2 pr-4 font-medium">
                Provider
              </th>
              <th scope="col" className="py-2 pr-4 font-medium">
                Purpose
              </th>
              <th scope="col" className="py-2 font-medium">
                Data processed
              </th>
            </tr>
          </thead>
          <tbody>
            {SUBPROCESSORS.map((row) => (
              <tr key={row.name} className="border-b border-border/60">
                <td className="py-3 pr-4 align-top font-medium">{row.name}</td>
                <td className="py-3 pr-4 align-top text-text-mute">{row.purpose}</td>
                <td className="py-3 align-top text-text-mute">{row.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </LegalPageShell>
  );
}
