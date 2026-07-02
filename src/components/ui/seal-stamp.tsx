"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/design/cn";

export type SealStatus = "locked" | "hit" | "miss";

const RING_COLOR: Record<SealStatus, string> = {
  locked: "var(--brass)",
  hit: "var(--verdigris)",
  miss: "var(--rust)",
};

const px = { sm: 32, md: 48, lg: 72 } as const;

function formatRingDate(date: Date) {
  return date
    .toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    .toUpperCase();
}

/**
 * The signature motif. A locked call gets an embossed brass seal with the
 * lock date set around its edge like a coin or postmark. On resolution a
 * second stamp overlays it -- HIT in verdigris, MISS in rust -- at a slight
 * rotation, like a librarian's due-date stamp. This is the only fully
 * circular element in the product; every other rounded surface uses
 * --r-card. Reserving the circle for this one motif keeps it meaningful.
 *
 * `animate` should only be true the instant a call is actually locked
 * client-side -- never on ordinary re-renders of historical data.
 *
 * `animateOnView` is the resolution-stamp variant (docs/MOTION.md A.3):
 * the HIT/MISS drop-in plays once when the stamp first enters the
 * viewport and never re-triggers on scroll.
 */
export function SealStamp({
  status,
  date,
  size = "md",
  animate = false,
  animateOnView = false,
  className,
}: {
  status: SealStatus;
  date: Date;
  size?: keyof typeof px;
  animate?: boolean;
  animateOnView?: boolean;
  className?: string;
}) {
  const dim = px[size];
  const ringId = useId();
  const rootRef = useRef<HTMLSpanElement>(null);
  const playedRef = useRef(false);
  const [resolveIn, setResolveIn] = useState(false);

  useEffect(() => {
    if (!animateOnView || status === "locked" || playedRef.current) return;
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !playedRef.current) {
          playedRef.current = true;
          setResolveIn(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animateOnView, status]);

  const ringDate = formatRingDate(date);
  const ringLabel =
    status === "locked"
      ? `LOCKED • ${ringDate} •`
      : status === "hit"
        ? `RESOLVED • HIT • ${ringDate} •`
        : `RESOLVED • MISS • ${ringDate} •`;

  const a11yLabel =
    status === "locked"
      ? `Locked ${ringDate}. Price target cannot be edited`
      : status === "hit"
        ? `Resolved hit on ${ringDate}`
        : `Resolved miss on ${ringDate}`;

  const radius = dim / 2;
  const textRadius = radius - dim * 0.11;

  return (
    <span
      ref={rootRef}
      role="img"
      aria-label={a11yLabel}
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: dim, height: dim }}
    >
      <svg
        width={dim}
        height={dim}
        viewBox={`0 0 ${dim} ${dim}`}
        className={cn(
          status === "locked" && animate && "seal-press",
          resolveIn && "seal-resolve",
        )}
      >
        <defs>
          <path
            id={ringId}
            d={`M ${radius - textRadius},${radius} a ${textRadius},${textRadius} 0 1 1 ${textRadius * 2},0 a ${textRadius},${textRadius} 0 1 1 ${-(textRadius * 2)},0`}
          />
        </defs>

        <circle
          cx={radius}
          cy={radius}
          r={radius - 1}
          fill="none"
          stroke={RING_COLOR[status]}
          strokeWidth={dim * 0.04}
          opacity={0.9}
        />
        <circle
          cx={radius}
          cy={radius}
          r={radius - dim * 0.16}
          fill="none"
          stroke={RING_COLOR[status]}
          strokeWidth={dim * 0.015}
          opacity={0.5}
        />

        <text fontSize={dim * 0.082} fill={RING_COLOR[status]} letterSpacing={dim * 0.012}>
          <textPath href={`#${ringId}`} startOffset="0%">
            {ringLabel}
          </textPath>
        </text>

        {status === "locked" ? (
          <path
            d={`M ${radius - dim * 0.14} ${radius - dim * 0.02}
                v ${-dim * 0.09}
                a ${dim * 0.14} ${dim * 0.14} 0 0 1 ${dim * 0.28} 0
                v ${dim * 0.09}
                m ${-dim * 0.34} 0
                h ${dim * 0.34}
                v ${dim * 0.2}
                h ${-dim * 0.34}
                z`}
            fill="none"
            stroke={RING_COLOR.locked}
            strokeWidth={dim * 0.025}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ) : (
          <text
            x={radius}
            y={radius + dim * 0.045}
            textAnchor="middle"
            fontFamily="var(--font-mono)"
            fontWeight={600}
            fontSize={dim * 0.24}
            letterSpacing={dim * 0.01}
            fill={RING_COLOR[status]}
            transform={`rotate(${status === "hit" ? -6 : 7} ${radius} ${radius})`}
          >
            {status === "hit" ? "HIT" : "MISS"}
          </text>
        )}
      </svg>

      {animate && (
        <span
          aria-hidden
          className="seal-ink-bleed pointer-events-none absolute inset-0 rounded-full"
          style={{ background: RING_COLOR[status] }}
        />
      )}
    </span>
  );
}
