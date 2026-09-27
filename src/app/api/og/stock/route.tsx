import { ImageResponse } from "next/og";
import { UNIVERSE } from "@/lib/universe";
import { loadGoogleFont } from "@/lib/seo/og-fonts";

export const runtime = "edge";

// Share images are rendered by Satori and cannot read CSS variables. These
// are the Direction B tokens: --paper, --ink, --text-mute, --border.
const PAPER = "#FAFAFA";
const INK = "#101418";
const MUTE = "#5B6470";
const LINE = "#E6E8EB";

/**
 * Share card per ticker: 1200x630, paper background, the ticker in JetBrains
 * Mono (tickers are the one thing mono is for), the company name in
 * Bricolage Grotesque, the price and footer in Inter.
 *
 * Runs on Edge for fast image generation, but the price comes from a same-
 * origin fetch to /api/market/quote rather than importing the market engine
 * directly: that engine goes through yahoo-finance2, a Node-only dependency
 * that cannot run in the Edge runtime.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const ticker = (url.searchParams.get("ticker") ?? "").toUpperCase();
  const meta = UNIVERSE.find((u) => u.ticker === ticker);
  const name = meta?.name ?? ticker;

  let price: number | null = null;
  if (ticker) {
    try {
      const res = await fetch(`${url.origin}/api/market/quote?ticker=${ticker}`);
      if (res.ok) {
        const body = (await res.json()) as { price?: number; available?: boolean };
        if (body.available && typeof body.price === "number") price = body.price;
      }
    } catch {
      // Card still renders without a price rather than failing the whole image.
    }
  }

  // Subset each font request to only the glyphs the card actually renders --
  // smaller font payload, faster Edge response.
  const monoText = ticker || "STOA";
  const displayText = `stoa${name || ticker}`;
  const interText = "$.,0123456789Independent analyst research";

  // Satori has no built-in fallback font -- it throws ("No fonts are loaded")
  // if this array is empty, so a Google Fonts outage genuinely fails this
  // route. There is no fontless render path to degrade to.
  const [mono, display, sans] = await Promise.all([
    loadGoogleFont("JetBrains Mono", 600, monoText),
    loadGoogleFont("Bricolage Grotesque", 800, displayText),
    loadGoogleFont("Inter", 600, interText),
  ]);
  const fonts = [
    { name: "JetBrains Mono", data: mono, weight: 600 as const, style: "normal" as const },
    { name: "Bricolage Grotesque", data: display, weight: 800 as const, style: "normal" as const },
    { name: "Inter", data: sans, weight: 600 as const, style: "normal" as const },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: PAPER,
          color: INK,
          padding: "64px 72px",
          fontFamily: "Inter",
        }}
      >
        <span style={{ fontFamily: "Bricolage Grotesque", fontSize: 44, letterSpacing: -1.8 }}>
          stoa
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 32 }}>
            <span style={{ fontFamily: "JetBrains Mono", fontSize: 132, letterSpacing: -2 }}>
              {ticker || "STOA"}
            </span>
            {price != null && (
              <span style={{ fontSize: 56 }}>${price.toFixed(2)}</span>
            )}
          </div>
          {name && (
            <span
              style={{
                fontFamily: "Bricolage Grotesque",
                fontSize: 52,
                lineHeight: 1.05,
                letterSpacing: -2,
              }}
            >
              {name}
            </span>
          )}
        </div>

        <div style={{ display: "flex", borderTop: `2px solid ${LINE}`, paddingTop: 24 }}>
          <span style={{ fontSize: 24, color: MUTE }}>Independent analyst research</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts,
      // Without an explicit Cache-Control, ImageResponse defaults to
      // immutable/max-age=31536000 -- since this route bakes in a live quote
      // fetched per request, that default would freeze the first price it
      // ever rendered into the CDN cache for a year. Revalidate hourly.
      headers: {
        "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
