# Product

## Register

product — app UI. Design serves the task (recording, watching, reading, and buying verified stock
research). The one deliberate brand-register exception is the marketing site (`/`,
`/how-it-works`, `/pricing`, `/about`) and the seal ceremony, which is the single orchestrated
moment allowed.

The full current product model — the video-first content model, the five surfaces, the Card
Engine, the Track Score — lives in `docs/PRODUCT_MODEL.md`. This file is the brand and design
register; that file is what the product does.

## Users & Purpose

- **Investors**: read Bloomberg/TipRanks/spreadsheets daily. They come to find analysts with a
  provable track record and buy their research. Dense information is a feature, not a bug.
- **Analysts (creators)**: publish video-first research. A publication is a short video, optionally
  enriched with a locked price call, evidence cards, and a written thesis. Only calls lock and get
  graded by the market; their reputation is the **Track Score** (0-100), built from resolved calls.

The product is a public ledger of claims made and outcomes proven, where nothing can be quietly
erased.

## Brand personality

Notary's seal, rubber date-stamp, certified document, ledger book. A financial newspaper, not a
fintech dashboard. Credible without borrowing trading-app cliches. Quiet everywhere so the seal
moment lands.

Three words: permanent, attributable, calm.

## Anti-references

- Candlestick-green gradients, gamified badges, glassmorphism, neon, AI-purple.
- Warm-cream "editorial template" and near-black + acid accent "dark SaaS template."
- A trading terminal. A social feed.

## Design principles

1. Six color tokens only (ink, paper, verdigris, brass, plum, rust); neutrals derived by opacity.
   Green and red (verdigris/rust) are the only **sentiment** colors — up/down, hit/miss. Brass
   (seal/certification) and plum (opinion) are non-sentiment accents.
2. **Primary buttons are solid ink. Navy is reserved for the wordmark.** A verdigris-green primary
   button is a bug, not the design.
3. Two radii (6px buttons/inputs, 12px cards). The seal is the only **ceremonial, angled** circle
   in the product; the Score Ring is an upright hairline frame, deliberately distinct from it.
4. Fraunces only where the product is *read*; IBM Plex Sans for chrome; IBM Plex Mono for
   anything scanned/compared (prices, dates, scores).
5. Trust-critical blocks (call block, disclosure block) get the doubled-hairline `.ledger-card`;
   ordinary content never does.
6. Motion at or below dial 3 (150-250ms, ease-out) everywhere except the seal press (~400ms).
   `prefers-reduced-motion` is mandatory.
7. The 90/10 fee split is repeated on every earnings surface, deliberately.

Full spec: `docs/FRONTEND.md` (source of truth for tokens). Product model: `docs/PRODUCT_MODEL.md`.
Agent rules: `AGENTS.md`.
