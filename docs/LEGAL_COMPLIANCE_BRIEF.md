# Stoa — Legal & Compliance Brief for Counsel

> **Product model has changed since this brief was written.** The current model (a video-first
> content model, among other changes) is captured in `docs/PRODUCT_MODEL.md`. This brief describes
> how the product works, so it must be reviewed and updated with counsel before it is relied on.
> The body below has NOT been revised for the new model.
### This is NOT legal advice and NOT drafted legal text. It's a briefing document — everything a lawyer needs to know about how the product actually works, so the engagement starts with informed drafting instead of hours of discovery. Hand this directly to whoever you retain, US and Israeli counsel both.

---

## 1. What Stoa is, in one paragraph

A two-sided marketplace where independent financial analysts publish research, lock a price
target (ticker, direction, target price, horizon date) at the moment of publication, and get
paid via subscription or per-report purchase. Every locked call is enforced immutable at the
database level — it cannot be edited or deleted after publication, including by Stoa itself.
Locked calls are graded automatically (Hit/Miss) against real market prices on their horizon
date, feeding a public "MOAT score" per analyst. An AI system fact-checks factual claims in each
report before publication is allowed (classifying claims as fact/unproven/opinion/contradicted)
but never writes or edits the analyst's thesis or price target — that's always the human
analyst's own view. The platform takes a 10% fee on analyst earnings via PayPal.

---

## 2. US positioning: the publisher's exclusion (Investment Advisers Act §202(a)(11))

The entire product was architected around qualifying for the "publisher's exclusion" from the
definition of "investment adviser" under the Advisers Act — meaning Stoa (the platform) and its
analysts are not required to register as investment advisers, provided the content stays
impersonal, bona fide, and of general and regular circulation. Specific things already built
into the product to support this positioning — confirm with counsel whether they're sufficient,
and what else is needed:

- **No 1:1 personalized advice channels anywhere in the product.** No direct messaging between
  an analyst and a subscriber exists anywhere in the spec. The only conversational surface is a
  "debate thread" scoped to a single claim on a published report, publicly visible to all readers
  of that report — not a private advice channel.
- **Content is general and impersonal by construction.** Reports are published once to all
  subscribers/purchasers simultaneously; there's no mechanism for an analyst to tailor content to
  an individual investor's circumstances.
- **Mandatory disclosure block on every report**, not removable or stylable by the analyst,
  requiring the analyst to disclose: whether they hold a position in the security, whether any
  compensation is tied to the call, and a certification that the views are their own.
- **"Not investment advice" disclaimer** intended sitewide, in the footer of every page (actual
  legal language not yet written — see Section 6).
- **AI fact-checker never generates investment recommendations.** It classifies the analyst's
  existing claims; it does not produce new analysis, targets, or opinions.

**Open question for counsel:** whether the per-report/subscription monetization model itself
(charging directly for individual pieces of research, as opposed to a flat-fee general
newsletter model) affects publisher's-exclusion eligibility, and whether the platform's 10% cut
of that revenue creates any additional characterization risk (e.g., as a broker-dealer-adjacent
activity) that needs separate analysis.

---

## 3. Israeli positioning: what to actually ask the ISA-side lawyer

Stoa's founder is Israel-based; the product is global/English-first. Below is real, specific
research to start from — not a substitute for counsel's own analysis.

- **Governing law:** the Regulation of Investment Advice, Investment Marketing and Portfolio
  Management Law, 1995, enforced by the Israel Securities Authority (ISA). Providing investment
  advice, marketing, or portfolio management without an ISA license is a criminal offense under
  Israeli law — the enforcement posture here is explicitly stricter in tone than the US civil
  framework, which is itself a reason not to assume the US analysis transfers.
- **A directly relevant precedent exists.** In February 2022, the ISA ruled that financial
  entities (the ruling concerned TASE members and institutional entities) may present financial
  analyses on their platforms that are prepared by *external, licensed* consultants, and that
  doing so is not investment advice on behalf of the platform itself — provided the platform
  "conducts itself transparently, prudentially, and with fiduciary responsibility by taking no
  personal interest in or interfering with the content of the analyses." Ask counsel directly:
  does this precedent extend to a platform whose contributing analysts are *not* separately
  ISA-licensed (Stoa's whole model is that the track record, not a license, is the credential),
  and does Stoa's 10% revenue share constitute the kind of "personal interest" the ruling warns
  against?
- **A second, more specific precedent on AI/chatbots.** In a 2024 ruling, the ISA held that AI
  chatbots presenting financial analysis must (a) present information "solely as general
  information," (b) never filter, reframe, or emphasize content in a way that could read as
  personalized advice, and (c) always give users access to the full underlying analysis, not just
  an AI-generated answer. This maps directly onto Stoa's AI ask-panel and fact-checker features —
  worth a specific compliance review of those two features against this ruling before they ship
  in any form that lets an investor query an AI about report content.
- **Not directly relevant, but worth ruling out explicitly:** the ISA's "35 offeree" private
  placement exemption concerns fundraising for investment vehicles (funds), which is a different
  activity from Stoa's publishing/marketplace model — flag to counsel that this shouldn't apply,
  but have them confirm rather than assume.
- **Practical question for counsel:** does Stoa need to geographically restrict or specially
  handle Israeli users differently from the rest of its global user base, given the ISA's
  historically protective posture toward foreign platforms operating in Israel without local
  licensing?

---

## 4. GDPR: the right-to-erasure vs. immutable-ledger tension

This is the one unresolved architectural question in the whole build, and it needs a real answer
before any EU user's data is processed.

**The tension:** Article 17 GDPR gives EU individuals a right to erasure. Stoa's core product
promise is that locked calls (which include the analyst's identity, since track record
accountability is the entire point) are permanently immutable and cannot be deleted, including by
Stoa.

**Proposed engineering approach, pending legal sign-off — do not treat this as settled:** on a
verified deletion request, pseudonymize the requester's personally identifying fields (name,
avatar, bio, email) in the `profiles` table, while leaving the locked `reports`/`claims`/
`moat_score_snapshots` rows intact under the now-anonymized handle. The public ledger entry
survives; the link to the real-world identity does not.

**Specific questions for counsel:**
- Does GDPR Article 17(3) provide an applicable exemption here (e.g., processing necessary for
  compliance with a legal obligation, for public interest archiving, or for establishing/
  defending legal claims), given that the immutable record exists specifically to make analysts'
  claims independently verifiable by the public?
- Is pseudonymization (versus full erasure) an adequate response under Article 17, or does it
  need to go further (e.g., full removal after a defined retention period, with the platform
  accepting that resolved-call statistics become anonymized/aggregate only)?
- Does this analysis differ for an EU-based analyst (whose own published track record is the
  product) versus an EU-based investor (a subscriber with no public-facing content)? These are
  likely different answers.
- What retention period, if any, applies to identity-verification data collected during
  analyst onboarding (PayPal performs KYC during seller onboarding — there is no separate
  identity product like Stripe Identity)?

---

## 5. Marketplace/payments structure

- PayPal Partner Referrals / Commerce Platform handles analyst KYC and payouts during
  seller onboarding; PayPal's own verification satisfies the "real accountable person"
  trust requirement. Platform fee splits use PayPal's marketplace fee mechanisms where
  approved.
- **Tax questions for counsel/accountant (not purely legal, but adjacent):** 1099 or local
  equivalent reporting obligations for analyst payouts, VAT/sales tax treatment of subscription
  revenue across jurisdictions, and whether the Israel-based operating entity creates any
  permanent-establishment exposure in jurisdictions where paying subscribers are concentrated.
- **Chargeback/dispute handling:** if a subscriber disputes a charge with their card issuer, does
  the corresponding analyst payout get clawed back, and how should that be reflected in the
  earnings ledger and communicated to the analyst? Needs both a legal answer (what Stoa is
  obligated to do) and a product answer (what's fair to analysts).

---

## 6. Documents that need to be drafted (not by me — flagging the complete list)

- [ ] Terms of Service (investor-facing)
- [ ] Terms of Service / Creator Agreement (analyst-facing — likely needs separate or additional
  terms given the payment/marketplace relationship, the disclosure certifications analysts make,
  and the licensing of their content to the platform)
- [ ] Privacy Policy (must address: what's collected at signup, identity verification data
  retention, PayPal/Supabase/DeepSeek/OpenAI/market-data-provider as subprocessors, cookie usage,
  cross-border data transfer given Israel + global users, the erasure-request mechanism from
  Section 4)
- [ ] "Not Investment Advice" disclosure (sitewide footer + a dedicated page)
- [ ] Cookie Policy
- [ ] Subprocessor list/Data Processing Agreement page (PayPal, Supabase, DeepSeek, OpenAI, market data
  provider — required disclosure under GDPR Article 28 if processing EU personal data)
- [ ] Acceptable Use Policy for analysts (what content/conduct gets a report or account removed —
  distinct from the disclosure/fact-check mechanics, this is a moderation/ToS enforcement question)

---

## 7. What's already built that a lawyer should see directly, not just hear described

Point counsel to these existing specs rather than re-explaining verbally — faster and more
accurate than a founder summarizing months of product decisions from memory:
- `docs/BACKEND.md` — full schema, the immutability triggers (§3), the disclosure fields on the
  `reports` table
- `docs/FRONTEND.md` §2.3 — the `<DisclosureBlock>` component (fixed layout, non-customizable)
- `Stoa_Backend_Deep_Dive_CHANGES.md` §6 — the GDPR pseudonymization proposal in full
- The AGENTS.md rule: "No 1:1 messaging between an analyst and a subscriber anywhere in the
  product" — this is enforced as a standing build rule, not just a policy statement
