# Product

## Register

product — app UI. Design serves the task (writing, reading, and buying verified stock research).
The one deliberate brand-register exception is the marketing site (`/`, `/how-it-works`,
`/pricing`, `/about`) and the seal ceremony, which is the single orchestrated moment allowed.

## Users & Purpose

- **Investors**: read Bloomberg/TipRanks/spreadsheets daily. They come to find analysts with a
  provable track record and buy their research. Dense information is a feature, not a bug.
- **Analysts (creators)**: publish reports with price calls that lock permanently at publish and
  get graded by the market. Their reputation is the MOAT score (0-100), built from resolved calls.

The product is a public ledger of claims made and outcomes proven, where nothing can be quietly
erased.

**Video is the main character.** The ledger proves an analyst was right; video is how a reader
decides to trust them in the first place. Text is the free tier that earns discovery, video is
what the subscription is for — the only block with per-block plan gating built in. Design
decisions that trade the written report against the video resolve in the video's favour. Spec:
`docs/VIDEO.md`.

## Brand personality

Notary's seal, rubber date-stamp, certified document, ledger book. Credible without borrowing
trading-app cliches. Quiet everywhere so the seal moment lands.

Three words: permanent, attributable, calm.

## Anti-references

- Candlestick-green gradients, gamified badges, glassmorphism, neon, AI-purple.
- Warm-cream "editorial template" and near-black + acid accent "dark SaaS template."
- A trading terminal. A social feed.

## Design principles

1. Six color tokens only (ink, paper, verdigris, brass, plum, rust); neutrals derived by opacity.
2. Two radii (6px buttons/inputs, 12px cards). The seal is the only full circle in the product.
3. Fraunces only where the product is *read*; IBM Plex Sans for chrome; IBM Plex Mono for
   anything scanned/compared (prices, dates, scores).
4. Trust-critical blocks (call block, disclosure block) get the doubled-hairline `.ledger-card`;
   ordinary content never does.
5. Motion at or below dial 3 (150-250ms, ease-out) everywhere except the seal press (~400ms).
   `prefers-reduced-motion` is mandatory.
6. The 90/10 fee split is repeated on every earnings surface, deliberately.

Full spec: `docs/FRONTEND.md` (source of truth). Agent rules: `AGENTS.md`.
