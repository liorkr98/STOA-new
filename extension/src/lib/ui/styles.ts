import { ANIMAL_TINT } from "@/lib/ui/animals";

/**
 * Stoa's tokens (docs/DESIGN_LANGUAGE.md), written out for the extension,
 * which cannot read the app's globals.css. The card is paper in both of
 * YouTube's themes; only the quiet line under it follows YouTube's theme.
 */
export const TOKENS = `
  --ink: #101418;
  --paper: #fafafa;
  --surface: #ffffff;
  --surface-2: #f2f3f5;
  --mute: #5b6470;
  --border: #e6e8eb;
  --border-strong: #c9ced4;
  --coral: #ff5a47;
  --on-coral: #101418;
  --coral-on-ink: #ff7a6a;
  --gain-text: #087a55;
  --loss-text: #c92a31;
  --bull-tint: ${ANIMAL_TINT.bull};
  --bear-tint: ${ANIMAL_TINT.bear};
  --font-ui: "Stoa Inter", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-mono: "Stoa Mono", "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  --font-display: "Stoa Bricolage", "Bricolage Grotesque", var(--font-ui);
  --ease: cubic-bezier(0.2, 0, 0, 1);
`;

/** @font-face rules go on the page itself: a shadow root cannot declare fonts. */
export function fontFaces(url: (path: string) => string): string {
  return `
@font-face{font-family:"Stoa Inter";src:url("${url("fonts/inter-latin-wght-normal.woff2")}") format("woff2");font-weight:100 900;font-display:swap}
@font-face{font-family:"Stoa Mono";src:url("${url("fonts/jetbrains-mono-latin-500-normal.woff2")}") format("woff2");font-weight:500;font-display:swap}
@font-face{font-family:"Stoa Mono";src:url("${url("fonts/jetbrains-mono-latin-600-normal.woff2")}") format("woff2");font-weight:600;font-display:swap}
@font-face{font-family:"Stoa Bricolage";src:url("${url("fonts/bricolage-grotesque-latin-wght-normal.woff2")}") format("woff2");font-weight:200 800;font-display:swap}
`;
}

/** Shared by the card's shadow root and the panel's. */
export const BASE_CSS = `
:host { all: initial; ${TOKENS} }
* { box-sizing: border-box; }
button { font: inherit; color: inherit; cursor: pointer; border: 0; background: none; padding: 0; margin: 0; }
button:focus-visible, a:focus-visible { outline: 2px solid var(--ink); outline-offset: 2px; }
.num { font-feature-settings: "tnum" 1; }
.up { color: var(--gain-text); }
.down { color: var(--loss-text); }
.mute { color: var(--mute); }
.etf { font: 600 11px/1 var(--font-ui); color: var(--mute); border: 1px solid var(--border-strong); border-radius: 999px; padding: 3px 6px; }

.taps { display: flex; gap: 8px; align-items: stretch; }
.tap { flex: 1 1 0; min-height: 44px; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border-radius: 10px; border: 1px solid var(--border); font: 600 15px/1 var(--font-ui); color: var(--ink);
  font-feature-settings: "tnum" 1; transition: transform 120ms var(--ease), border-color 120ms var(--ease); }
.tap.bull { background: var(--bull-tint); border-color: color-mix(in srgb, #3e9d6f 22%, var(--surface)); }
.tap.bear { background: var(--bear-tint); border-color: color-mix(in srgb, #e86060 22%, var(--surface)); }
.tap:hover { border-color: var(--border-strong); }
.tap:active { transform: scale(0.97); }
.square { flex: 0 0 44px; width: 44px; min-height: 44px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 10px; font: 600 16px/1 var(--font-ui); }
.square.info { background: var(--surface); border: 1px solid var(--border); color: var(--ink); }
.square.info:hover { border-color: var(--border-strong); }
.square.open { background: var(--ink); color: var(--paper); }
.square svg { display: block; }
.glyph { font: 700 17px/1 var(--font-ui); }

.confirm { min-height: 44px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  border-radius: 10px; background: var(--ink); color: var(--paper); padding: 0 16px; font: 500 14px/1.2 var(--font-ui); }
.confirm button { color: var(--coral-on-ink); font-weight: 600; min-height: 44px; padding: 0 4px; }

@media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
`;

export const CARD_CSS = `
${BASE_CSS}
.root { display: block; font: 400 14px/1.4 var(--font-ui); color: var(--ink); margin: 0 0 16px; }
.card { background: var(--paper); border: 1px solid var(--border); border-radius: 14px; padding: 14px 16px 16px;
  display: grid; gap: 10px; transform-origin: top center; animation: card-in 220ms var(--ease) both; }
.card.leaving { animation: card-out 200ms var(--ease) both; }
@keyframes card-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: none; } }
@keyframes card-out { to { opacity: 0; transform: scale(0.98); } }
.head { display: flex; align-items: baseline; gap: 10px; min-width: 0; }
.ticker { font: 600 20px/1 var(--font-mono); letter-spacing: 0; }
.name { font: 500 15px/1.2 var(--font-ui); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.head .spacer { flex: 1; }
.when { font: 500 12px/1 var(--font-ui); font-feature-settings: "tnum" 1; color: var(--mute); }
.close { width: 28px; height: 28px; margin: -6px -8px -6px 0; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; color: var(--mute); align-self: center; }
.close:hover { background: var(--surface-2); color: var(--ink); }
.what { font: 400 13px/1.35 var(--font-ui); color: var(--mute); min-height: 18px; }
.what .price { color: var(--ink); font-weight: 500; font-feature-settings: "tnum" 1; }

.line { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 10px; font: 400 13px/1 var(--font-ui); }
.line .label { margin-right: 4px; }
.chip { font: 600 12px/1 var(--font-mono); padding: 6px 8px; border-radius: 6px; min-height: 26px; }
.line.dark .label, .line.dark .ahead { color: #aab0b8; }
.line.dark .chip { background: rgba(255,255,255,0.1); color: #f3f4f6; }
.line.dark .chip:hover { background: rgba(255,255,255,0.18); }
.line.dark .chip.on { background: var(--paper); color: var(--ink); }
.line.light .label, .line.light .ahead { color: var(--mute); }
.line.light .chip { background: var(--surface-2); color: var(--ink); }
.line.light .chip:hover { background: #e6e8eb; }
.line.light .chip.on { background: var(--ink); color: var(--paper); }

.save { margin-top: 12px; background: var(--paper); border: 1px solid var(--border); border-radius: 14px; padding: 10px 10px 10px 16px;
  display: flex; align-items: center; justify-content: space-between; gap: 12px; font: 500 14px/1.2 var(--font-ui); }
.save button { background: var(--coral); color: var(--on-coral); border-radius: 999px; font: 600 14px/1 var(--font-ui); padding: 0 16px; min-height: 40px; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

export const PANEL_CSS = `
${BASE_CSS}
.dim { position: fixed; inset: 0; background: rgba(16, 20, 24, 0.32); z-index: 2147483000; animation: fade 180ms var(--ease) both; }
.panel { position: fixed; top: 0; right: 0; bottom: 0; width: min(420px, 100vw); background: var(--paper); color: var(--ink);
  z-index: 2147483001; display: flex; flex-direction: column; font: 400 14px/1.45 var(--font-ui);
  border-left: 1px solid var(--border); box-shadow: 0 8px 40px rgba(16,20,24,0.18); animation: slide 220ms var(--ease) both; }
@keyframes fade { from { opacity: 0; } }
@keyframes slide { from { transform: translateX(24px); opacity: 0; } }
.scroll { flex: 1; overflow-y: auto; padding: 32px 32px 16px; }
.top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.big { font: 600 32px/1 var(--font-mono); }
.sub { color: var(--mute); margin-top: 8px; font-size: 14px; }
.x { width: 40px; height: 40px; border-radius: 10px; background: var(--surface-2); display: inline-flex; align-items: center; justify-content: center; }
.x:hover { background: var(--border); }
.quote { margin-top: 24px; display: flex; align-items: baseline; gap: 10px; }
.quote .px { font: 600 28px/1 var(--font-ui); font-feature-settings: "tnum" 1; }
.quote .chg { font: 500 14px/1 var(--font-ui); font-feature-settings: "tnum" 1; }
.chart { margin-top: 20px; height: 88px; }
.chart svg { width: 100%; height: 100%; display: block; overflow: visible; }
.about { margin-top: 20px; font-size: 15px; line-height: 1.55; }
.stance { margin-top: 12px; color: var(--mute); font-size: 13px; }
.facts { margin-top: 24px; display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px; }
.facts dt { color: var(--mute); font-size: 12px; }
.facts dd { margin: 2px 0 0; font: 500 15px/1.2 var(--font-ui); font-feature-settings: "tnum" 1; }
.cover { display: inline-block; margin-top: 24px; color: var(--ink); font-size: 14px; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; }
.foot { padding: 16px 32px 32px; display: flex; gap: 8px; }
.foot .tap { flex: 0 0 96px; }
.foot .go { flex: 1; min-height: 44px; border-radius: 10px; background: var(--ink); color: var(--paper); font: 600 15px/1 var(--font-ui); display: inline-flex; align-items: center; justify-content: center; gap: 6px; }
.foot .confirm { flex: 1; }
`;
