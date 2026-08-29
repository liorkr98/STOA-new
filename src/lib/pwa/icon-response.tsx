import { ImageResponse } from "next/og";

const PAPER = "#FAF8F4";
const INK = "#14171F";

/** Ink colonnade on paper. Safe zone is inset so maskable icons stay readable. */
export function stoaIconResponse(size: number) {
  const pad = Math.round(size * 0.22);
  const inner = size - pad * 2;
  const barW = Math.round(inner * 0.14);
  const gap = Math.round(inner * 0.14);
  const midH = inner;
  const leftH = Math.round(inner * 0.72);
  const rightH = Math.round(inner * 0.58);
  const rx = Math.max(2, Math.round(barW * 0.35));

  return new ImageResponse(
    (
      <div
        style={{
          width: size,
          height: size,
          background: PAPER,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            gap,
            height: inner,
            width: inner,
          }}
        >
          <div
            style={{
              width: barW,
              height: leftH,
              background: INK,
              borderRadius: rx,
              opacity: 0.45,
            }}
          />
          <div
            style={{
              width: barW,
              height: midH,
              background: INK,
              borderRadius: rx,
            }}
          />
          <div
            style={{
              width: barW,
              height: rightH,
              background: INK,
              borderRadius: rx,
              opacity: 0.45,
            }}
          />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
