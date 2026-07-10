/** Legal document types tracked in legal_documents / user_consents. */
export type LegalDocType = "terms" | "terms_creator" | "privacy" | "cookies";

/** Required at signup for all users. */
export const SIGNUP_CONSENT_TYPES: LegalDocType[] = ["terms", "privacy"];

export const LEGAL_DOC_LABELS: Record<LegalDocType, string> = {
  terms: "Terms of Service",
  terms_creator: "Creator Terms",
  privacy: "Privacy Policy",
  cookies: "Cookie Policy",
};

export const LEGAL_DOC_PATHS: Record<LegalDocType, string> = {
  terms: "/terms",
  terms_creator: "/terms/creators",
  privacy: "/privacy",
  cookies: "/cookies",
};

/** Structural placeholders — not legal copy. */
export const PLACEHOLDER_SECTIONS: Record<string, string[]> = {
  terms: [
    "Acceptance of Terms",
    "Platform Description & Not-Advice Disclaimer",
    "User Accounts & Eligibility",
    "Analyst Content & Independence",
    "Subscriptions & Payments",
    "Intellectual Property",
    "Limitation of Liability",
    "Dispute Resolution",
    "Changes to Terms",
    "Contact",
  ],
  terms_creator: [
    "Creator Eligibility",
    "Content Standards & Fact-Checking",
    "Pricing & Payouts (PayPal)",
    "Track Record & Immutability",
    "Tax & Regulatory Responsibilities",
    "Termination",
    "Contact",
  ],
  privacy: [
    "Data Controller",
    "Information We Collect",
    "How We Use Information",
    "Legal Bases (GDPR)",
    "Sharing & Subprocessors",
    "Retention",
    "Your Rights",
    "International Transfers",
    "Children",
    "Contact & DPO",
  ],
  cookies: [
    "What Are Cookies",
    "Essential Cookies",
    "Analytics Cookies (if enabled)",
    "Your Choices",
    "Contact",
  ],
  not_advice: [
    "Publisher, Not Adviser",
    "Independent Analyst Opinions",
    "No Recommendation to Buy or Sell",
    "Past Performance",
    "Your Responsibility",
  ],
  accessibility: [
    "Our Commitment",
    "Standards",
    "Known Limitations",
    "Feedback & Contact",
  ],
};

export function showLegalPlaceholderBanner(): boolean {
  return process.env.NEXT_PUBLIC_LEGAL_PLACEHOLDER_BANNER === "1";
}
