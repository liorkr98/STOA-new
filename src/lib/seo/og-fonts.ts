/**
 * Edge-safe Google Fonts loader for ImageResponse (next/og, formerly
 * @vercel/og). ImageResponse lives at "next/og" as of Next 14+ ("next/server"
 * is deprecated). Satori -- the renderer behind it -- cannot read a CSS
 * @font-face link the way a normal page can; it needs the actual font file
 * bytes as an ArrayBuffer via the `fonts` option, so we fetch them ourselves.
 *
 * Older write-ups (2022-era @vercel/og) fetch Google's CSS with a spoofed
 * legacy-Safari User-Agent to force a truetype response, because Satori's
 * woff2 support was incomplete then. Verified against the version actually
 * bundled here (@vercel/og 0.7.2, checked via node_modules): Google now
 * serves woff2 regardless of that trick, and this Satori build decodes woff2
 * directly -- so we fetch whatever format the default request returns rather
 * than fighting Google's CDN for a format we no longer need.
 */
export async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`;
  const cssRes = await fetch(cssUrl);
  const css = await cssRes.text();
  const match = css.match(/src: url\(([^)]+)\) format\('[^']+'\)/);
  if (!match) {
    throw new Error(`loadGoogleFont: no font source for ${family} (status ${cssRes.status})`);
  }
  const res = await fetch(match[1]);
  if (!res.ok) throw new Error(`loadGoogleFont: failed to fetch font bytes for ${family}`);
  return res.arrayBuffer();
}
