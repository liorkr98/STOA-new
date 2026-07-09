"use client";

import { useEffect, useState } from "react";
import type { Direction } from "@/lib/types";
import { DirectionTag } from "@/components/ui/tag";
import { price } from "@/lib/format";

export function PredictionCardPreview({
  ticker,
  direction,
  target,
}: {
  ticker: string;
  direction: Direction;
  target: string;
}) {
  const [live, setLive] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/market/quote?ticker=${encodeURIComponent(ticker)}`)
      .then((r) => r.json())
      .then((j: { price?: number }) => setLive(j.price ?? null))
      .catch(() => setLive(null));
  }, [ticker]);

  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-bg/50 p-4">
      <div className="flex items-center justify-between">
        <span className="num text-xl font-semibold">{ticker}</span>
        <DirectionTag direction={direction} />
      </div>
      <p className="num mt-2 text-2xl font-semibold">
        {live != null ? `$${price(live)}` : "-"}
      </p>
      <p className="t-meta mt-1">
        Entry locks at publish{target ? ` · Target $${target}` : ""}
      </p>
    </div>
  );
}
