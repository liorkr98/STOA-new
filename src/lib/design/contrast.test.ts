/**
 * The colour law, enforced. Run with `npm run test:contrast`; CI runs it.
 *
 * 1. Measures every text-on-surface and fill-with-its-ink pair in both
 *    themes, straight from globals.css, and fails under WCAG AA (4.5:1).
 * 2. Scans the source for the combinations the tokens exist to prevent:
 *    white words on a coloured fill, the bright fill tones used as words,
 *    uppercase or letterspaced labels, mono off a ticker, retired tokens.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { PAPER_DARK, PAPER_LIGHT } from "@/lib/profile/accent";

const css = readFileSync("src/app/globals.css", "utf8");

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {\n`);
  assert.ok(start >= 0, `no ${selector} block in globals.css`);
  const body = css.slice(start, css.indexOf("\n}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/^\s*(--[\w-]+):\s*([^;]+);/gm)) out[m[1]] = m[2].trim();
  return out;
}

const light = block(":root");
const dark = { ...light, ...block(".dark") };

function resolve(theme: Record<string, string>, name: string, depth = 0): string {
  const raw = theme[name];
  assert.ok(raw, `token ${name} is not defined`);
  const ref = raw.match(/^var\((--[\w-]+)\)$/);
  if (ref) {
    assert.ok(depth < 8, `token ${name} loops`);
    return resolve(theme, ref[1], depth + 1);
  }
  assert.match(raw, /^#[0-9a-f]{6}$/i, `token ${name} must resolve to a 6-digit hex, got ${raw}`);
  return raw.toLowerCase();
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const SURFACES = ["--paper", "--surface", "--surface-2"];
const WORDS = [
  "--text",
  "--text-mute",
  "--coral-text",
  "--gain-text",
  "--loss-text",
  "--up",
  "--down",
  "--error",
  "--ok",
  "--pending",
  "--mark-edited",
];
const FILLS: [fill: string, ink: string][] = [
  ["--coral", "--on-coral"],
  ["--gain", "--on-gain"],
  ["--loss", "--on-loss"],
  ["--accent", "--accent-ink"],
];

for (const [themeName, theme] of [["light", light], ["dark", dark]] as const) {
  test(`${themeName}: every coloured or grey word clears 4.5:1 on every surface`, () => {
    for (const word of WORDS) {
      for (const surface of SURFACES) {
        const r = ratio(resolve(theme, word), resolve(theme, surface));
        assert.ok(r >= 4.5, `${word} on ${surface} is ${r.toFixed(2)}:1`);
      }
    }
  });

  test(`${themeName}: every fill carries an ink that clears 4.5:1`, () => {
    for (const [fill, ink] of FILLS) {
      const r = ratio(resolve(theme, fill), resolve(theme, ink));
      assert.ok(r >= 4.5, `${ink} on ${fill} is ${r.toFixed(2)}:1`);
    }
  });

  test(`${themeName}: decorative faint text still clears 3:1`, () => {
    const r = ratio(resolve(theme, "--text-faint"), resolve(theme, "--paper"));
    assert.ok(r >= 3, `--text-faint on --paper is ${r.toFixed(2)}:1`);
  });
}

test("light: the bright fills really do fail as words, so they must stay fills", () => {
  // If this ever passes 4.5 the split is unnecessary; if it fails the rule
  // below is what keeps coral words legible.
  assert.ok(ratio(resolve(light, "--coral"), resolve(light, "--surface")) < 4.5);
});

test("the storefront accent checker measures against the real paper", () => {
  assert.equal(PAPER_LIGHT, resolve(light, "--paper"));
  assert.equal(PAPER_DARK, resolve(dark, "--paper"));
});

const source = execSync("git ls-files 'src/*.tsx' 'src/*.ts' 'src/*.css'", { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter((f) => !f.endsWith("contrast.test.ts"))
  .map((file) => ({ file, text: readFileSync(file, "utf8") }));

function offenders(pattern: RegExp, allow: (file: string) => boolean = () => false) {
  const hits: string[] = [];
  for (const { file, text } of source) {
    if (allow(file)) continue;
    text.split("\n").forEach((line, i) => {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return;
      if (pattern.test(line)) hits.push(`${file}:${i + 1}  ${line.trim().slice(0, 120)}`);
    });
  }
  return hits;
}

test("no white or paper words on a coloured fill", () => {
  const hits = offenders(
    /\bbg-(coral|gain|loss)\b[^"'`]*\btext-(white|paper|\[var\(--(paper|accent-ink)\)\])|\btext-(white|paper|\[var\(--(paper|accent-ink)\)\])[^"'`]*\bbg-(coral|gain|loss)\b/,
  );
  assert.deepEqual(hits, [], `white text on coral/gain/loss:\n${hits.join("\n")}`);
});

test("the bright fill tones are never used for words", () => {
  const hits = offenders(
    /text-\[var\(--(coral|gain|loss)\)\]|(?<![-\w])color:\s*["']?var\(--(coral|gain|loss)\)/,
  );
  assert.deepEqual(hits, [], `use --coral-text / --gain-text / --loss-text for words:\n${hits.join("\n")}`);
});

test("no uppercase or letterspaced labels", () => {
  const hits = offenders(
    /(?<![\w-])uppercase(?![\w-])|text-transform:\s*uppercase|tracking-(wide|wider|widest|\[0?\.\d+em\])|letter-spacing:\s*0?\.\d+em/,
    (f) => f.startsWith("src/app/api/og/"),
  );
  assert.deepEqual(hits, [], `uppercase / letterspaced labels:\n${hits.join("\n")}`);
});

test("mono only on tickers", () => {
  const hits = offenders(/\bfont-mono\b|var\(--font-mono\)/, (f) =>
    ["src/components/ui/chip.tsx", "src/app/globals.css"].includes(f),
  );
  assert.deepEqual(hits, [], `font-mono outside the ticker chip:\n${hits.join("\n")}`);
  const cssMono = css
    .split(/\n(?=[^\s].*\{)/)
    .filter((rule) => /font-family:\s*var\(--font-mono\)/.test(rule))
    .map((rule) => rule.split("{")[0].trim());
  assert.deepEqual(
    cssMono.filter((sel) => !/ticker/.test(sel)),
    [],
    "stylesheet rules using mono must be ticker rules",
  );
});

test("retired tokens stay retired", () => {
  const hits = offenders(
    /var\(--(brass|verdigris|rust|plum|r-btn|r-card|r-tag|radius-btn|radius-card|radius-tag|font-fraunces|font-plex-[\w-]+)\)/,
  );
  assert.deepEqual(hits, [], `retired tokens:\n${hits.join("\n")}`);
});
