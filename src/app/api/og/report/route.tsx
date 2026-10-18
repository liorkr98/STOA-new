import { ImageResponse } from "next/og";
import { getReportPreview } from "@/lib/db/reports";
import { loadGoogleFont } from "@/lib/seo/og-fonts";

// Same tokens as the ticker card (api/og/stock): --paper, --ink, --text-mute, --border.
const PAPER = "#FAFAFA";
const INK = "#101418";
const MUTE = "#5B6470";
const LINE = "#E6E8EB";

/**
 * Share card per publication: 1200x630, the headline in Bricolage Grotesque,
 * the analyst in Inter, the ticker in JetBrains Mono. It shows what a link
 * preview may show and nothing of the body, and it does not depend on any
 * stored image, so it works whatever the reader could open.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id") ?? "";
  const preview = /^[0-9a-f-]{36}$/.test(id) ? await getReportPreview(id) : null;
  const title = preview?.title || "Independent analyst research";
  const analyst = preview?.analyst ?? "";
  const ticker = preview?.ticker ?? "";
  const size = title.length > 90 ? 52 : title.length > 50 ? 64 : 76;

  const [mono, display, sans] = await Promise.all([
    loadGoogleFont("JetBrains Mono", 600, ticker || "STOA"),
    loadGoogleFont("Bricolage Grotesque", 800, `stoa${title}`),
    loadGoogleFont("Inter", 600, `${analyst}Independent analyst research on Stoa`),
  ]);

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
        <span style={{ fontFamily: "Bricolage Grotesque", fontSize: 44, letterSpacing: -1.8 }}>stoa</span>
        <span style={{ fontFamily: "Bricolage Grotesque", fontSize: size, lineHeight: 1.05, letterSpacing: -2 }}>
          {title}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 24, borderTop: `2px solid ${LINE}`, paddingTop: 24 }}>
          {analyst ? <span style={{ fontSize: 28 }}>{analyst}</span> : null}
          {ticker ? <span style={{ fontFamily: "JetBrains Mono", fontSize: 28, color: MUTE }}>{ticker}</span> : null}
          {!analyst && !ticker ? <span style={{ fontSize: 24, color: MUTE }}>Independent analyst research</span> : null}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "JetBrains Mono", data: mono, weight: 600, style: "normal" },
        { name: "Bricolage Grotesque", data: display, weight: 800, style: "normal" },
        { name: "Inter", data: sans, weight: 600, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
    },
  );
}
