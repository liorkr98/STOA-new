"use client";

import { useEffect, useState } from "react";
import {
  attestPrice,
  type AttestedPriceData,
  type AttestationMarket,
} from "@/services/price-attestation";
import { PriceAttestationCard } from "@/components/ui/price-attestation-card";

function resolveMarket(ticker: string): AttestationMarket {
  return ticker.toUpperCase().endsWith(".TA") ? "IL" : "US";
}

export function PriceAttestationSection({ ticker }: { ticker: string }) {
  // One tagged result instead of three flags. Tagging it with the ticker it
  // belongs to means "still loading" is derived during render, so the effect
  // never has to reset state synchronously on a ticker change.
  const [result, setResult] = useState<{
    ticker: string;
    data: AttestedPriceData | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    void attestPrice({ ticker, market: resolveMarket(ticker) })
      .then((outcome) => {
        if (cancelled) return;
        setResult(
          outcome.success
            ? { ticker, data: outcome.data, error: null }
            : { ticker, data: null, error: outcome.error },
        );
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ ticker, data: null, error: "Unable to fetch attested quote." });
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  const settled = result?.ticker === ticker ? result : null;
  const loading = settled === null;
  const data = settled?.data ?? null;
  const error = settled?.error ?? null;

  return (
    <PriceAttestationCard
      title="Price attestation"
      loading={loading}
      error={error}
      data={data}
    />
  );
}
