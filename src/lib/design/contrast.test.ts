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
function hue(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const d = max - Math.min(r, g, b);
  if (d === 0) return 0;
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
}

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

  test(`${themeName}: error words read on their own box`, () => {
    const r = ratio(resolve(theme, "--error"), resolve(theme, "--error-soft"));
    assert.ok(r >= 4.5, `--error on --error-soft is ${r.toFixed(2)}:1`);
  });

  test(`${themeName}: the error red stays clear of the price red`, () => {
    // The red exception for errors is only safe while it cannot pass for a
    // price move: keep it at least 15 degrees of hue away from loss.
    const a = hue(resolve(theme, "--error"));
    const b = hue(resolve(theme, "--loss-text"));
    const gap = Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    assert.ok(gap >= 15, `--error and --loss-text are only ${gap.toFixed(1)} degrees apart`);
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

test("the faint grey is decoration, never a text colour", () => {
  const hits = offenders(/(?<![\w-])(?:[a-z]+:)*text-text-faint\b|(?<![-\w])color:\s*["']?var\(--text-faint\)/);
  assert.deepEqual(hits, [], `faint text fails 4.5:1; use text-text-mute:\n${hits.join("\n")}`);
});

test("the reading size is only for the report body and the Compose editor", () => {
  // Both render through .stoa-prose in globals.css; nothing else may use it.
  const hits = offenders(/\btext-reading\b|--type-reading/, (f) => f === "src/app/globals.css");
  assert.deepEqual(hits, [], `reading size outside .stoa-prose:\n${hits.join("\n")}`);
});

test("retired tokens stay retired", () => {
  const hits = offenders(
    /var\(--(brass|verdigris|rust|plum|r-btn|r-card|r-tag|radius-btn|radius-card|radius-tag|font-fraunces|font-plex-[\w-]+)\)/,
  );
  assert.deepEqual(hits, [], `retired tokens:\n${hits.join("\n")}`);
});

/* ---------------------------------------------- the Interest Cart animals --- */

const ANIMALS_FILE = "src/components/interest-cart/animals.tsx";
const animalsSource = readFileSync(ANIMALS_FILE, "utf8");
const animalColours = [
  ...(animalsSource.match(/CART_ANIMAL_COLOURS = \[([^\]]+)\]/)?.[1].matchAll(/"(#[0-9a-f]{6})"/gi) ?? []),
].map((m) => m[1].toLowerCase());

test("the Interest Cart animals are the recorded exception, colour for colour", () => {
  const law = readFileSync("docs/DESIGN_LANGUAGE.md", "utf8");
  const start = law.indexOf("**The Interest Cart animals");
  assert.ok(start >= 0, "DESIGN_LANGUAGE.md must record the Interest Cart animals exception");
  const section = law.slice(start, law.indexOf("**THE ERROR EXCEPTION", start));
  const recorded = [...section.matchAll(/^\s*\| `(#[0-9A-Fa-f]{6})` \|/gm)].map((m) => m[1].toLowerCase());
  assert.equal(animalColours.length, 5, "animals.tsx must list its five colours in CART_ANIMAL_COLOURS");
  assert.deepEqual([...recorded].sort(), [...animalColours].sort(), "the doc and animals.tsx disagree");
  const drawn = new Set([...animalsSource.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/gi)].map((m) => m[1].toLowerCase()));
  assert.deepEqual([...drawn].sort(), [...animalColours].sort(), "animals.tsx draws a colour it does not declare");
});

test("the animal colours appear nowhere but the animals file", () => {
  const pattern = new RegExp(animalColours.join("|"), "i");
  // The one other file is the analyst's own diagram themes (a third-party
  // "neon" palette that happens to contain #ff6b6b): diagram ink chosen by
  // the author, not Stoa chrome, so it is not a second drawing of the bear.
  const hits = offenders(pattern, (f) => f === ANIMALS_FILE || f === "src/lib/diagram/colors.ts");
  assert.deepEqual(hits, [], `cart animal colours outside ${ANIMALS_FILE}:\n${hits.join("\n")}`);
});

test("the animals' measured contrast matches what the law records", () => {
  // Dark: both clear the 3:1 asked of a graphic. Light: they do not, and the
  // doc says so with these figures. If the colours or surfaces move, this
  // fails and the doc has to be measured again.
  const [bull, , bear] = animalColours;
  for (const surface of SURFACES) {
    const onDark = resolve(dark, surface);
    assert.ok(ratio(bull, onDark) >= 3 && ratio(bear, onDark) >= 3, `an animal under 3:1 on dark ${surface}`);
    const onLight = resolve(light, surface);
    const [b, r] = [ratio(bull, onLight), ratio(bear, onLight)];
    assert.ok(b >= 1.95 && b <= 2.25, `bull on light ${surface} is ${b.toFixed(2)}:1, the doc says 2.0 to 2.2`);
    assert.ok(r >= 2.45 && r <= 2.8, `bear on light ${surface} is ${r.toFixed(2)}:1, the doc says 2.5 to 2.8`);
  }
});

test("no cart control relies on the animals alone: every button is labelled", () => {
  const tap = readFileSync("src/components/interest-cart/cart-tap.tsx", "utf8");
  assert.match(tap, /aria-label=\{label\}/, "each cart tap button needs its spoken label");
  assert.match(tap, /Add a \$\{side\} tap for \$\{ticker\}/, "the label names the side and the ticker");
  assert.match(animalsSource, /aria-hidden/, "the artwork itself is decoration under the label");
});

test("a stance is plain ink, so the cart's animals are the only green and red beside a ticker", () => {
  const hits = offenders(/text-(gain|loss)\b|var\(--(up|down|gain|loss|gain-text|loss-text)\)/, (f) =>
    !["src/components/ui/chip.tsx", "src/components/feed/stance-card.tsx"].includes(f),
  );
  assert.deepEqual(hits, [], `a stance drawn in a price colour:\n${hits.join("\n")}`);
});

for (const [themeName, theme] of [["light", light], ["dark", dark]] as const) {
  test(`${themeName}: the cart's count badge (paper on ink) clears 4.5:1`, () => {
    const r = ratio(resolve(theme, "--paper"), resolve(theme, "--ink"));
    assert.ok(r >= 4.5, `--paper on --ink is ${r.toFixed(2)}:1`);
  });
}
