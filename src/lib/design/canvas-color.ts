/**
 * A theme colour as a string a canvas chart library can parse.
 *
 * Several tokens are `color-mix(...)` (text-faint, border, text-mute), and
 * lightweight-charts throws "Failed to parse color" on anything that is not
 * hex, rgb(a) or a named colour. That throw took down every ticker page.
 * The browser's own canvas parses the token and hands it back as rgba.
 *
 * Accepts `--name` or `var(--name)`. Returns "" when the token is missing or
 * the browser cannot parse it, so callers keep their own fallback.
 */
export function canvasColor(token: string): string {
  if (typeof document === "undefined") return "";
  const name = token.replace(/^var\((--[\w-]+)\)$/, "$1");
  const raw = name.startsWith("--")
    ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    : name;
  if (!raw) return "";
  if (/^(#[0-9a-f]{3,8}|rgba?\([^()]*\))$/i.test(raw)) return raw;

  const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  const sentinel = "rgba(1, 2, 3, 0.5)";
  ctx.fillStyle = sentinel;
  ctx.fillStyle = raw;
  const parsed = String(ctx.fillStyle);
  if (parsed === sentinel) return "";
  if (/^(#[0-9a-f]{6}|rgba?\([^()]*\))$/i.test(parsed)) return parsed;

  // Chrome serializes a mix as `color(srgb r g b / a)`, channels 0 to 1.
  const srgb = parsed.match(/^color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
  if (srgb) {
    const [r, g, b] = srgb.slice(1, 4).map((v) => Math.round(Number(v) * 255));
    return `rgba(${r}, ${g}, ${b}, ${Number(srgb[4] ?? 1)})`;
  }

  // Anything else: paint one pixel and read it back. Resizing the canvas
  // resets its state, so the colour is set again after.
  ctx.canvas.width = 1;
  ctx.canvas.height = 1;
  ctx.fillStyle = raw;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgba(${r}, ${g}, ${b}, ${Number((a / 255).toFixed(3))})`;
}
