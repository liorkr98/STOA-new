# AGENT_SKILLS.md — Skills for the Stoa research-platform build

> Durable reference for the research-platform build (spec v3, Section 0). Skills are `SKILL.md`
> folders under `.agents/skills/` that load progressively (~100 tokens until relevant). This doc
> lists what to install, why, and documents the three **project skills authored in this repo** that
> encode Stoa's domain.

## Security first

Skills can run arbitrary code. **Read each `SKILL.md` before installing.** Prefer official /
high-star sources. Pin installs in `skills-lock.json` (the repo already does this for the Supabase
skills, with a `computedHash` per skill). Never install a skill that persists generated output over
`design-system/MASTER.md` or `docs/*` — see the ban in `docs/MOTION.md` Part C.

## 0.1 Build & data skills

| Skill | Source | Why |
|-------|--------|-----|
| `supabase-postgres-best-practices` | `supabase/agent-skills` | **Present.** Governs Part C RLS/JSONB and all schema work. Keep. |
| `supabase` | `supabase/agent-skills` | **Present.** Supabase FTS reference (Part E search), storage. Keep. |
| document skills (docx / pdf / pptx / xlsx) | `anthropics/skills` | Report export (Part E) — render TipTap JSON to Word/PDF server-side. |
| `skill-creator` | `anthropics/skills` | Authoring/optimizing the project skills below. |
| knowledge-work / official plugins | `anthropics/knowledge-work-plugins`, `anthropics/claude-plugins-official` | Vetted directory (Supabase, PayPal/Stripe, testing). |
| TDD / debugging / planning | `obra/superpowers` | Use for the valuation-math TDD (`src/lib/valuation/model.ts`, A1). |
| Sentry setup | `getsentry/*` | Instrument the new video / webhook / data-service routes. |

## 0.2 Design skills (what makes generated UI look intentional)

| Skill | Source | Why |
|-------|--------|-----|
| `frontend-design` / `web-design-guidelines` | Anthropic official; `vercel-labs/agent-skills` (MIT) | Pushes generation away from generic "AI slop" toward intentional design. Already available in this environment; install into the repo too. |
| `ui-ux-pro-max` | `nextlevelbuilder/ui-ux-pro-max-skill` | Design-system generation, palettes, font pairings, chart/dashboard guidance. **Use for its domain searches only** (`--domain chart`, `--domain ux`, `--stack nextjs`). |
| D3 charts skill | community (@chrisvoncsefalvay) | Real D3 data-viz — the dashboard/heatmap work (A1 sensitivity, Part G dashboards). |
| Frontend Aesthetics Cookbook block | Anthropic cookbook | Token-enforcement rules already encoded in `CLAUDE.md`/`AGENTS.md`. |

> **Hard ban (repeat of `docs/MOTION.md` Part C.1):** never run any design-system generator with
> `--persist` against this repo. `ui-ux-pro-max --design-system --persist` writes to
> `design-system/MASTER.md` and would overwrite the ledger-and-seal system with a generic one. This
> is almost certainly how the repo got its original rogue spec. Domain **searches** are encouraged;
> **persisting generated systems is forbidden.**

Optional (only if shadcn is adopted later): official shadcn/ui skill, `mattbx/shadcn-skills`,
`masonjames/Shadcnblocks-Skill`. Stoa uses Tailwind + custom components today, so **not needed now.**

## 0.3 Project skills authored in this repo (highest leverage)

These encode Stoa's domain so every generated surface stays correct. Each is a folder under
`.agents/skills/` with a `SKILL.md`. **Read the skill; the skill points at the durable docs — the
docs stay the source of truth, the skill is the always-loaded pointer.**

### `stoa-design-system`
The tokens, backgrounds, data-viz scales, density model, and component patterns from
`docs/DESIGN_LANGUAGE.md`, so every generated surface stays on-brand. Loads whenever a UI/visual
change is in play.

### `stoa-valuation`
The DCF / multiples / DDM / scenario math and rounding conventions (Part A1/A2), backed by
`decimal.js`, pure and unit-tested in `src/lib/valuation/model.ts`. Loads for any valuation-math
work. Pair with `obra/superpowers` for TDD.

### `stoa-market-data`
The Section-1 data-layer contract (`docs/DATA_STACK.md`): providers, caching TTLs, symbol
normalization, the `zod`-at-the-boundary rule, and the **four-touch editor-node pattern** so every
new data endpoint and every new block is added identically each time. Loads for any market-data or
new-block work.

## The four-touch pattern (encoded in `stoa-market-data`, referenced everywhere)

Every new editor block touches exactly four places, and **`buildExtensions()` stays the single
extension set** so the editor and `report-renderer.tsx` render identically (spec invariant #1):

1. **Pure node** — `src/lib/editor/tiptap/nodes/<name>-node.ts` (`Node.create`, attributes, no
   React). Cache computed/reader-facing values in attributes (invariant #2), like
   `chartNode.screenshotUrl`.
2. **React node view** — `src/components/editor/tiptap/nodes/<name>-node-view.tsx`.
3. **Register** — add the node to `buildExtensions()` in
   `src/lib/editor/tiptap/extensions.ts` (the one shared set).
4. **Slash item** — append to `SLASH_ITEMS` in `src/components/editor/tiptap/slash-menu.ts`
   (`group: "Data"` for data blocks).

## Installing / pinning

New skills go under `.agents/skills/<name>/SKILL.md` and get an entry in `skills-lock.json`
(`source`, `sourceType`, `skillPath`, `computedHash`) so installs are reproducible and auditable.
Project skills authored here are versioned with the repo; third-party skills are pinned by hash.
