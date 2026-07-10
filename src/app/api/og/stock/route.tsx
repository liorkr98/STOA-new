import { ImageResponse } from "next/og";
import { UNIVERSE } from "@/lib/universe";
import { loadGoogleFont } from "@/lib/seo/og-fonts";

export const runtime = "edge";

const INK = "#14171f";
const PAPER = "#eff1ed";
const VERDIGRIS = "#2f6e5d";

/**
 * Ledger-styled OG card per ticker: 1200x630, ink background, doubled
 * hairline border, Plex Mono for the ticker/price, Fraunces for the company
 * name -- the same trust language as the .ledger-card treatment elsewhere.
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
  const monoText = `${ticker}$.0123456789STOAVERIFIEDANALYSTLEDGERIMMUTABLETRACKRECORD·`;
  const serifText = name || ticker;

  // Satori has no built-in fallback font -- it throws ("No fonts are loaded")
  // if this array is empty, so a Google Fonts outage genuinely fails this
  // route. That matches every other @vercel/og example in the wild; there's
  // no fontless render path to degrade to.
  const [plexMono, fraunces] = await Promise.all([
    loadGoogleFont("IBM+Plex+Mono", 600, monoText),
    loadGoogleFont("Fraunces", 500, serifText),
  ]);
  const fonts = [
    { name: "IBM Plex Mono", data: plexMono, weight: 600 as const, style: "normal" as const },
    { name: "Fraunces", data: fraunces, weight: 500 as const, style: "normal" as const },
  ];

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: INK,
          position: "relative",
          padding: "56px",
          fontFamily: "IBM Plex Mono",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 24,
            border: `1px solid ${PAPER}2e`,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 30,
            border: `1px solid ${PAPER}14`,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex" }}>
            <span
              style={{
                fontSize: 22,
                letterSpacing: 6,
                color: `${PAPER}8c`,
                textTransform: "uppercase",
              }}
            >
              STOA
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 28 }}>
              <span
                style={{
                  fontSize: 132,
                  fontWeight: 600,
                  color: PAPER,
                  letterSpacing: -3,
                }}
              >
                {ticker || "STOA"}
              </span>
              {price != null && (
                <span style={{ fontSize: 56, fontWeight: 600, color: VERDIGRIS }}>
                  ${price.toFixed(2)}
                </span>
              )}
            </div>
            {name && (
              <span
                style={{
                  fontFamily: "Fraunces",
                  fontSize: 40,
                  color: `${PAPER}d9`,
                }}
              >
                {name}
              </span>
            )}
          </div>

          <div style={{ display: "flex" }}>
            <span
              style={{
                fontSize: 18,
                letterSpacing: 3,
                color: `${PAPER}80`,
                textTransform: "uppercase",
              }}
            >
              {`Verified analyst ledger ${String.fromCharCode(0xb7)} Immutable track record`}
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts },
  );
}
