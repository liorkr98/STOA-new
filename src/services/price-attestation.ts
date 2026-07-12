"use server";

import "server-only";
import { createClient } from "@/lib/supabase/server";

export type AttestationMarket = "US" | "IL";
export type AttestationMarketState = "REGULAR" | "CLOSED" | "PRE" | "POST";
export type AttestationCurrency = "USD" | "ILS";

export interface AttestationPayload {
  ticker: string;
  market: AttestationMarket;
}

export interface AttestedPriceData {
  ticker: string;
  normalized_ticker: string;
  price: number;
  currency: AttestationCurrency;
  timestamp: string;
  market_state: AttestationMarketState;
  attestation: {
    id: string;
    method: "MULTI_SOURCE_DELAYED_FEED";
    latency_disclosure: string;
  };
}

interface EdgeAttestedPriceResponse {
  success: boolean;
  data?: AttestedPriceData;
  error?: string;
}

export type AttestPriceResult =
  | { success: true; data: AttestedPriceData }
  | { success: false; error: string };

function normalizeRequest(input: AttestationPayload): AttestationPayload | null {
  const ticker = input.ticker.trim().toUpperCase();
  if (!ticker) return null;
  if (input.market !== "US" && input.market !== "IL") return null;
  return { ticker, market: input.market };
}

function parseEdgeResponse(payload: EdgeAttestedPriceResponse): AttestPriceResult {
  if (!payload.success || !payload.data) {
    return { success: false, error: payload.error ?? "Price attestation failed" };
  }
  return { success: true, data: payload.data };
}

export async function attestPrice(input: AttestationPayload): Promise<AttestPriceResult> {
  const requestPayload = normalizeRequest(input);
  if (!requestPayload) {
    return { success: false, error: "Ticker and market are required." };
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!projectUrl || !anonKey) {
    return { success: false, error: "Supabase environment is not configured." };
  }

  try {
    const response = await fetch(`${projectUrl}/functions/v1/attest-price`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anonKey,
        Authorization: `Bearer ${session?.access_token ?? anonKey}`,
      },
      body: JSON.stringify(requestPayload),
      cache: "no-store",
    });

    const raw = await response.text();
    let json: EdgeAttestedPriceResponse;
    try {
      json = JSON.parse(raw) as EdgeAttestedPriceResponse;
    } catch {
      if (response.status === 429) {
        return {
          success: false,
          error: "Quote service is busy. Wait a moment, then change the ticker to retry.",
        };
      }
      return {
        success: false,
        error: "Unable to attest price right now. Try again in a few seconds.",
      };
    }

    if (!response.ok && json.success !== false) {
      return {
        success: false,
        error:
          response.status === 429
            ? "Quote service is busy. Wait a moment, then change the ticker to retry."
            : "Unable to attest price right now.",
      };
    }

    return parseEdgeResponse(json);
  } catch {
    return { success: false, error: "Unable to reach the attestation service." };
  }
}
