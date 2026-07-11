/** Factual product descriptions for legal pages — not final legal copy. */

export interface LegalSectionContent {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
}

export const TERMS_CONTENT: LegalSectionContent[] = [
  {
    title: "Acceptance of Terms",
    paragraphs: [
      "These Terms govern your use of Stoa as an investor or reader. By creating an account or using the platform, you agree to these Terms and our Privacy Policy. Final binding language is subject to counsel review.",
    ],
  },
  {
    title: "Platform Description & Not-Advice Disclaimer",
    paragraphs: [
      "Stoa is a two-sided marketplace where independent financial analysts publish research, lock a price target (ticker, direction, target price, horizon date) at publication, and may be paid via subscription or per-report purchase. Locked calls are enforced immutable at the database level — they cannot be edited or deleted after publication, including by Stoa itself.",
      "Stoa is a research marketplace, not a broker or registered investment adviser. Nothing on the platform is investment, tax, or legal advice. See our Not Investment Advice page for how the product is designed.",
    ],
  },
  {
    title: "User Accounts & Eligibility",
    paragraphs: [
      "You must be at least 18 years old to create an account. You are responsible for keeping your credentials secure and for activity under your account.",
    ],
  },
  {
    title: "Analyst Content & Independence",
    paragraphs: [
      "Research on Stoa reflects the independent views of individual analysts, not Stoa. Content is published once to all subscribers and purchasers simultaneously — there is no mechanism for analysts to tailor research to an individual investor's circumstances.",
      "There is no direct messaging between an analyst and a subscriber. The only conversational surface is a public debate thread scoped to a single claim on a published report, visible to all readers — not a private advice channel.",
      "Every published report includes a mandatory disclosure block (not removable or customizable by the analyst) covering position disclosure, compensation tied to the call, and certification that views are the analyst's own.",
    ],
  },
  {
    title: "Subscriptions & Payments",
    paragraphs: [
      "Payments are processed via PayPal. Stoa collects a 10% platform fee on analyst earnings. Pricing, billing cycles, and refund handling will be specified in final Terms once counsel completes drafting.",
    ],
    bullets: [
      "Subscription access to an analyst's research feed",
      "Per-report purchases where offered",
      "Simulated wallet/credits may be used in demo or pre-production environments",
    ],
  },
  {
    title: "Intellectual Property",
    paragraphs: [
      "Analysts retain ownership of their research subject to the license they grant Stoa to host, display, and distribute published content on the platform. Stoa's brand, software, and scoring systems remain Stoa property.",
    ],
  },
  {
    title: "Limitation of Liability",
    paragraphs: [
      "[Pending legal draft — counsel to define liability caps, disclaimers, and exclusions appropriate to a research marketplace.]",
    ],
  },
  {
    title: "Dispute Resolution",
    paragraphs: [
      "[Pending legal draft — counsel to specify governing law, venue, and dispute resolution mechanism.]",
    ],
  },
  {
    title: "Changes to Terms",
    paragraphs: [
      "When we update these Terms, we will publish a new version and may require re-acceptance for continued use of the platform. Material changes will be communicated in advance where required by law.",
    ],
  },
  {
    title: "Contact",
    paragraphs: ["Questions about these Terms: legal@stoa.app"],
  },
];

export const CREATOR_TERMS_CONTENT: LegalSectionContent[] = [
  {
    title: "Creator Eligibility",
    paragraphs: [
      "Analyst and creator accounts are subject to application review. You must provide accurate identity and payout information through PayPal onboarding, which includes PayPal's own verification during seller setup.",
    ],
  },
  {
    title: "Content Standards & Fact-Checking",
    paragraphs: [
      "Before publication is allowed, an AI-assisted fact-checker classifies factual claims in your report (fact, unproven, opinion, or contradicted). The fact-checker does not write or edit your thesis or price target — those remain your own views.",
      "You must complete the mandatory disclosure block on every report: position in the security, compensation tied to the call, and certification that views are your own.",
    ],
  },
  {
    title: "Pricing & Payouts (PayPal)",
    paragraphs: [
      "Creator payouts are handled via PayPal Partner Referrals / Commerce Platform. Stoa retains a 10% platform fee on your earnings. Tax reporting obligations (e.g., 1099 or local equivalents) are your responsibility — counsel and your accountant will advise on specifics.",
    ],
  },
  {
    title: "Track Record & Immutability",
    paragraphs: [
      "When you lock a call at publication, the record (ticker, direction, target price, horizon date, and linked report) becomes permanently immutable at the database level. This supports public accountability and MOAT score grading (Hit/Miss against real market prices on the horizon date).",
      "You may not edit or delete locked calls after publication, including through Stoa support.",
    ],
  },
  {
    title: "Tax & Regulatory Responsibilities",
    paragraphs: [
      "You are responsible for compliance with applicable securities, tax, and licensing laws in jurisdictions where you operate or publish. Stoa does not provide regulatory or tax advice. Counsel should advise whether your activity requires registration in your jurisdiction.",
    ],
  },
  {
    title: "Termination",
    paragraphs: [
      "Stoa may suspend or terminate creator accounts for violations of these Terms or the Acceptable Use Policy. Published locked calls remain on the public record; account pseudonymization may apply to deletion requests per our Privacy Policy and counsel-approved GDPR process.",
    ],
  },
  {
    title: "Contact",
    paragraphs: ["Creator program questions: legal@stoa.app"],
  },
];

export const PRIVACY_CONTENT: LegalSectionContent[] = [
  {
    title: "Data Controller",
    paragraphs: [
      "Stoa operates globally with an Israel-based founder. The identity of the data controller and any EU representative will be specified in the final Privacy Policy after counsel review.",
    ],
  },
  {
    title: "Information We Collect",
    bullets: [
      "Account data: email, display name, profile information at signup",
      "Identity and payout data: PayPal onboarding signals (payments receivable, email confirmation)",
      "Content: published reports, locked calls, debate threads, and related metadata",
      "Usage data: session tokens, preferences, subscription and purchase history",
      "Technical data: IP address and request logs at the infrastructure layer (Vercel)",
    ],
  },
  {
    title: "How We Use Information",
    paragraphs: [
      "We use personal data to operate the marketplace, authenticate users, process payments, grade locked calls, display public track records, enforce fact-checking and disclosure requirements, and comply with legal obligations.",
    ],
  },
  {
    title: "Legal Bases (GDPR)",
    paragraphs: [
      "[Pending legal draft — counsel to map processing activities to GDPR Articles 6 and 9 bases, including contract performance, legitimate interests, and consent where applicable.]",
    ],
  },
  {
    title: "Sharing & Subprocessors",
    paragraphs: [
      "We share data with service providers who process it on our behalf. See our Subprocessors page for the current list, including PayPal, Supabase, AI providers, market data sources, Cloudflare, and Vercel.",
    ],
  },
  {
    title: "Retention",
    paragraphs: [
      "Locked calls and published research are retained permanently as part of the public accountability record. Identity verification data retention periods are subject to counsel sign-off.",
    ],
  },
  {
    title: "Your Rights",
    paragraphs: [
      "Depending on your jurisdiction, you may have rights to access, correct, export, or delete personal data. You can export your account data from Settings.",
      "Erasure vs. immutable ledger: GDPR Article 17 gives EU individuals a right to erasure. Stoa's core product promise is that locked calls (linked to analyst identity for track-record accountability) cannot be deleted. The proposed engineering approach — pending legal sign-off — is to pseudonymize personally identifying fields in profiles (name, avatar, bio, email) on verified deletion requests while leaving locked reports, claims, and MOAT score snapshots intact under an anonymized handle. The public ledger entry survives; the link to real-world identity does not.",
    ],
    bullets: [
      "Does Article 17(3) provide an exemption for publicly verifiable analyst records?",
      "Is pseudonymization adequate, or must records become aggregate-only after a retention period?",
      "Does treatment differ for EU analysts (public track record) vs. EU investors (subscribers)?",
    ],
  },
  {
    title: "International Transfers",
    paragraphs: [
      "Data may be processed in the United States, Israel, and other locations where our subprocessors operate. Cross-border transfer mechanisms will be documented in the final Privacy Policy.",
    ],
  },
  {
    title: "Children",
    paragraphs: ["Stoa is not directed at users under 18. We do not knowingly collect data from minors."],
  },
  {
    title: "Contact & DPO",
    paragraphs: [
      "Privacy requests: privacy@stoa.app. A Data Protection Officer contact will be added if required after counsel review.",
    ],
  },
];

export const COOKIES_CONTENT: LegalSectionContent[] = [
  {
    title: "What Are Cookies",
    paragraphs: [
      "Cookies and similar technologies help Stoa remember your session, preferences, and consent choices. This policy describes what we use today and what may be added with notice.",
    ],
  },
  {
    title: "Essential Cookies",
    paragraphs: [
      "Required for authentication (Supabase session), security, and storing your cookie consent choice. These cannot be disabled while using the platform.",
    ],
  },
  {
    title: "Analytics Cookies (if enabled)",
    paragraphs: [
      "We may add analytics cookies in the future. When enabled, they will be disclosed here and controlled through the cookie consent banner. Non-essential cookies are off by default.",
    ],
  },
  {
    title: "Your Choices",
    paragraphs: [
      "Use the cookie banner to accept or decline non-essential cookies. You can also clear cookies through your browser settings, though this may sign you out.",
    ],
  },
  {
    title: "Contact",
    paragraphs: ["Cookie questions: privacy@stoa.app"],
  },
];

export const NOT_ADVICE_CONTENT: LegalSectionContent[] = [
  {
    title: "Publisher, Not Adviser",
    paragraphs: [
      "Stoa is architected as a research publishing marketplace, not a personalized investment advisory service. The platform and its analysts are not presented as registered investment advisers. Final legal positioning under the US Investment Advisers Act publisher's exclusion (§202(a)(11)) requires counsel confirmation.",
    ],
  },
  {
    title: "Independent Analyst Opinions",
    paragraphs: [
      "Every price target, thesis, and recommendation on Stoa is the independent view of the publishing analyst. Stoa does not endorse, verify the merit of, or guarantee any analyst's views. MOAT scores reflect historical grading of locked calls against market prices — they are not a forecast of future performance.",
    ],
  },
  {
    title: "No Recommendation to Buy or Sell",
    paragraphs: [
      "Research on Stoa is general and impersonal. It is published simultaneously to all subscribers and purchasers. It is not tailored to your financial situation, goals, risk tolerance, or tax circumstances. You should consult qualified professionals before making investment decisions.",
    ],
  },
  {
    title: "AI Tools",
    paragraphs: [
      "Stoa's AI fact-checker classifies factual claims in analyst reports before publication. It does not generate investment recommendations, price targets, or opinions. Any AI-assisted features that let users query report content are designed to present general information — counsel is reviewing compliance with applicable regulations including ISA guidance on AI chatbots presenting financial analysis.",
    ],
  },
  {
    title: "Past Performance",
    paragraphs: [
      "Historical Hit/Miss grades and MOAT scores reflect past locked calls only. Past performance does not guarantee future results.",
    ],
  },
  {
    title: "Your Responsibility",
    paragraphs: [
      "You are solely responsible for your investment decisions. Stoa is a research marketplace, not a broker. We do not execute trades or hold customer funds beyond payment processing.",
    ],
  },
];
