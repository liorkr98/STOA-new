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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AttestedPriceData | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);

    void attestPrice({ ticker, market: resolveMarket(ticker) })
      .then((result) => {
        if (cancelled) return;
        if (result.success) {
          setData(result.data);
          setError(null);
        } else {
          setError(result.error);
          setData(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Unable to fetch attested quote.");
        setData(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ticker]);

  return (
    <PriceAttestationCard
      title="Price attestation"
      loading={loading}
      error={error}
      data={data}
    />
  );
}
