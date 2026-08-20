# Stoa — Motion & Polish Spec

> **Product model updated** — see `docs/PRODUCT_MODEL.md`. This document predates that change and needs review.

### The go-live elevation pass. Extends `docs/FRONTEND.md` §1.5 — where they differ, this doc wins on motion; FRONTEND.md wins on everything else.

Three inputs are encoded here, so Claude Code doesn't need to re-derive them per session:
Emil Kowalski's motion system (his official `emil-design-eng` skill + animations.dev principles),
the UI/UX Pro Max audit workflow, and a safe-usage protocol for 21st.dev Magic MCP.

---

## PART A — MOTION SYSTEM (Emil-grade)

### A.1 Tokens — add to `globals.css`, use nothing else

```css
:root {
  /* Easing — custom curves; built-in CSS easings are too weak to feel intentional */
  --ease-out:     cubic-bezier(0.23, 1, 0.32, 1);    /* enters, reveals, releases */
  --ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);   /* on-screen movement, morphs */
  --ease-hover:   ease;                                /* color/border hover shifts only */
  --ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);     /* bottom sheets / drawers */
  /* Duration — everything under 300ms except the one ceremony */
  --dur-1: 120ms;   /* exits, hovers, subsequent-in-group popovers */
  --dur-2: 180ms;   /* popovers, dropdowns, tab underline */
  --dur-3: 240ms;   /* modals, content fades, paywall lift */
  --dur-ceremony: 400ms;  /* the seal. Nothing else may use this. */
}
```

### A.2 Laws (violations are bugs, not taste differences)

1. **Never `ease-in` for UI.** Starts slow, reads sluggish. Decision tree: entering/exiting →
   `--ease-out`; moving/morphing on screen → `--ease-in-out`; hover color/border → `--ease-hover`;
   constant motion (spinners, progress) → `linear`. Default → `--ease-out`.
2. **Animate `transform` and `opacity` only.** Never width/height/top/left/margin/padding.
   `filter: blur()` allowed only in the seal ink-bleed and skeleton crossfade, ≤4px.
3. **Exits faster than enters.** Exit duration = one token step below the enter (enter `--dur-3`
   → exit `--dur-2`). Exits don't stagger.
4. **The frequency rule.** The more often a user sees an element, the less it should animate.
   Studio, Compose, nav, sidebar, filter chips, feed scrolling: zero entrance animation.
   The seal and resolution stamps are rare — that's why they've earned ceremony. If someone
   proposes animating something seen 50×/day, the answer is no.
5. **Enter distance is 4–8px, never 20+.** `y: 8px → 0` with opacity. No slide-ins from
   off-screen except drawers.
6. **Origin-aware popovers.** Everything that opens from a trigger scales from that trigger:
   `transform-origin` from Radix's `--radix-*-content-transform-origin` var. A fact-check
   popover grows out of the underlined claim, not from screen center.
7. **Press feedback on primary actions:** scale 1 → 0.97 on press, spring back on release
   (Motion: `whileTap={{scale:0.97}}`, stiffness 400, damping 25). Buttons only — never cards.
8. **Interruptible by default.** Use CSS transitions or Motion springs that retarget mid-flight;
   avoid fixed keyframe animations on anything interactive.
9. **`prefers-reduced-motion` is mandatory everywhere.** Reduced = instant state swap with a
   plain 80ms opacity fade. The seal becomes "already stamped." No exceptions, including toasts.
10. **No stagger-spam.** Stagger only genuinely related list items, groups of 3–7, 40ms steps,
    once per mount — never on scroll, never re-triggered by filtering.
11. **Scroll reveals: one sanctioned pattern, and only on editorial pages.** Timer-driven,
    observer-triggered "reveal on scroll" stays banned (it fires late in hidden tabs, ships blank
    sections to headless renderers, and re-plays). What is allowed is the landing page's
    **scrub-based** reveal: a CSS view-timeline animation (`animation-timeline: view()`) whose
    progress *is* the reader's scroll position, like a scrollbar, so it never triggers, never
    re-plays and never waits on a timer. Constraints: restrained (opacity plus a rise of 12px or
    less over the first ~35% of entry, no scale, no stagger); `transform` and `opacity` only;
    inside `@supports (animation-timeline: view())` so browsers without it simply show the content;
    and always inside `@media (prefers-reduced-motion: no-preference)` so reduced motion collapses
    it to nothing. Editorial and marketing surfaces only (the landing, a report's long read);
    never Studio, Compose, nav, sidebars, feeds or lists. Reference implementation:
    `.landing-reveal` in `src/app/globals.css`.

### A.3 Component-by-component

| Component | Motion | Duration / easing |
|---|---|---|
| **SealStamp — lock** | The ceremony, refined: (1) press: seal scales 1→0.96, 80ms ease-in — the only sanctioned ease-in, because it's a physical press, not UI; (2) settle: 0.96→1 with 8°→0° rotation, `--ease-out`; (3) ink-bleed: radial opacity + 2px blur→0 overlapping the settle. Total ≤400ms. | `--dur-ceremony` |
| **SealStamp — resolve (HIT/MISS)** | Same language, smaller: stamp drops in at scale 1.15→1 + opacity, slight rotation settle. Plays once when the resolved card first enters the viewport (IntersectionObserver, once, never re-triggers on scroll). | 300ms `--ease-out` |
| **FactCheck popover** | Scale 0.96→1 + opacity from the claim's underline (origin-aware). **Group rule (Emil's tooltip pattern):** the first popover a reader opens animates; while the reader keeps hovering claim-to-claim within ~300ms gaps, subsequent popovers appear *instantly* — the reader is scanning, don't make them wait. Group resets after 1.5s idle. | enter `--dur-2`, exit `--dur-1`, in-group: 0ms |
| **DebateThread (mobile sheet)** | Use **Vaul** — gesture-driven, spring-based, interruptible, drag-to-dismiss. Desktop side panel: x 8px→0 + opacity. | Vaul defaults / `--dur-3` |
| **Toasts** | Use **Sonner**. Bottom-center desktop, bottom mobile. The "Locked" toast carries the seal glyph. Default timings — don't restyle motion. | Sonner defaults |
| **LockConfirmModal** | Overlay opacity 0→1; panel scale 0.98→1 + opacity, `--ease-out`. Exit reverse, faster. | enter `--dur-3`, exit `--dur-2` |
| **Track Score odometer** | Tabular-nums count from previous → new value, `--ease-out`, once per *meaningful* change (page load after a resolve; the resolve notification). Never on rerenders, never looping. | 600ms |
| **PaywallGate unlock** | The paid moment earns a small lift: scrim gradient fades out while revealed content rises y 8px→0. One-time per unlock. | `--dur-3` `--ease-out` |
| **FeedCard hover** | Border-color shift + translateY(-1px). **No scale, no shadow-grow** — scale on large surfaces reads cheap and shadows violate the elevation system. | `--dur-1` `--ease-hover` |
| **Dropdowns / role switcher / bell** | Scale 0.97→1 + opacity, origin at trigger edge. | `--dur-2` / `--dur-1` exit |
| **Tabs (My Reports, Discover)** | Shared underline slides between tabs, `--ease-in-out`. Panel content: plain 120ms opacity crossfade, no translate. | `--dur-2` |
| **Skeleton → content** | Crossfade with 2px blur→0 on incoming content. Skeletons never pop out. | `--dur-2` |
| **StatusChip change** | Old chip fades/scales out, new one in — never text morphing. | `--dur-1` out, `--dur-2` in |
| **Notifications list** | New unread item: single y 6px→0 + opacity on arrival. Existing items never re-animate. | `--dur-2` |

### A.4 Explicitly do NOT animate

Live prices and % changes in the ticker strip (they update constantly — frequency rule; just swap,
tabular-nums prevents layout shift). Route/page transitions. Nav and sidebar. Filter chip
selection beyond the browser-default background transition. Feed cards mounting on scroll
(observer-triggered reveals of any kind; the scrub-based landing reveal in law 11 is the one
exception). Text content. Chart lines on every data refresh (animate once on first mount only).
The DisclosureBlock — it never moves, ever; stillness is part of its authority.

---

## PART B — MAGIC MCP PROTOCOL (21st.dev)

Magic MCP generates polished React components from prompts inside Cursor/Claude Code. Powerful,
and dangerous for exactly one reason: its output ships in default shadcn/Tailwind aesthetics —
the precise generic look our design system exists to avoid. Rules:

1. **Scaffold-only tool.** Use it for structure + interaction wiring on complex, undifferentiated
   chrome: the ⌘K command-palette search (creators + tickers), sortable data tables (per-report
   performance, subscriber list, payout history), settings forms, the Compose editor toolbar,
   pricing tier cards, date/horizon pickers.
2. **Mandatory re-skin pass before commit** — every Magic-generated component gets: fonts mapped
   to Plex Sans / Plex Mono (Fraunces only if it's editorial content, which scaffolded chrome
   never is); colors mapped to the six tokens, all literal hex deleted; radii forced to 6/12;
   every `shadow-*` class removed; gradients removed; spacing snapped to the `--space-*` scale.
   A Magic component with a stray `shadow-lg` or `rounded-full` in the diff fails review.
3. **Forbidden surfaces.** Magic never touches the trust surfaces: SealStamp, DisclosureBlock,
   the call block, MoatBadge, FactCheckLayer, PaywallGate, LockConfirmModal. These are the
   product's identity and are hand-built to `docs/FRONTEND.md` Part 2. Scaffolding them from a
   component library would make the most differentiated screens look the most generic.
4. Setup lives in the IDE's MCP config with a 21st.dev API key — take the exact config block from
   21st.dev's install page for your Cursor/Claude Code version rather than copying a snippet
   that may have rotated.

---

## PART C — UI/UX PRO MAX PROTOCOL + GO-LIVE USER-ALIGNMENT AUDIT

### C.1 Safe usage on this repo

- **Allowed, encouraged:** domain searches as pre-PR checks —
  `search.py "animation accessibility z-index loading" --domain ux`,
  `--domain chart` before touching Recharts, `--stack nextjs` for framework guidance.
- **Banned on this repo:** the design-system generator with persist
  (`--design-system --persist`). It writes to `design-system/MASTER.md` — the exact file we
  rewrote — and will overwrite the ledger-and-seal system with a fresh generic one. This is
  almost certainly how the repo got its original rogue spec. Add to AGENTS.md anti-patterns:
  "Running any design-system generator that persists output into this repo."

### C.2 The go-live audit — run per page, fix before launch

This is the "everything aligned for the user" check, as a concrete pass Claude Code executes
against every route in `docs/FRONTEND.md` Parts 3–6:

1. **3-second test:** screenshot the page cold. Can a stranger answer "where am I / what do I do
   here" from the screenshot alone? If the answer requires reading body copy, the hierarchy fails.
2. **One primary CTA:** exactly one filled `--ink` button visible per screen. Two = demotion bug.
3. **States matrix:** every route × {loading, empty, error, populated}. Any cell that renders a
   blank area, an unexplained spinner, or a raw error string fails. Empty states must contain a
   recovery action, not just a sentence.
4. **Copy echo:** the verb on the trigger is the verb in the confirmation ("Lock it in" → toast
   "Locked"). Any "Submitted successfully" anywhere is a fail.
5. **Trust surface invariance:** call block, DisclosureBlock, MoatBadge render complete at 360px
   width — nothing trust-critical truncated, collapsed, or hidden behind a tap on mobile.
6. **Touch targets ≥44px** on all mobile interactive elements, including fact-check underlines
   (the tap target is the whole line-height, not the 2px underline).
7. **Focus:** tab through every page; visible verdigris focus ring on every stop, logical order,
   modals trap focus, Escape closes popovers/sheets.
8. **Contrast re-verified against `--paper`** (#EFF1ED), not white — muted `--ink`-at-60% text
   must still clear 4.5:1 where it carries meaning.
9. **Reduced-motion QA:** flip `prefers-reduced-motion` on and click through lock → resolve →
   unlock. Everything must state-swap cleanly; a half-playing seal is a fail.
10. **Numbers:** every price, score, %, and date renders in Plex Mono with `font-variant-numeric:
    tabular-nums`. Any proportional-figure number in a column or ticker is a fail.
11. **Paywall integrity (security, not style):** view-source on a gated report as a logged-out
    user — full `body_markdown` must be absent from HTML and any serialized props. CSS-hidden
    content is a launch blocker. If this fails, the fix is the server-side entitlement gate —
    backend work (Cursor), not frontend.
12. **Dead-end sweep:** no screen may strand the user — every error and empty state links
    somewhere sensible; the 404 offers Explore and search.

Run order: audit the trust loop first (signup → verify → compose → lock → report page → unlock →
resolve), fix everything there to zero defects, then sweep the remaining routes. Perfection where
trust is judged; solid everywhere else.
