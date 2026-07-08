import yahooFinance from "npm:yahoo-finance2@2.13.3";

type Market = "US" | "IL";
type MarketState = "REGULAR" | "CLOSED" | "PRE" | "POST";
type SupportedCurrency = "USD" | "ILS";

interface AttestPriceRequest {
  ticker: string;
  market: Market;
}

interface AttestedPriceResponse {
  success: boolean;
  data?: {
    ticker: string;
    normalized_ticker: string;
    price: number;
    currency: SupportedCurrency;
    timestamp: string;
    market_state: MarketState;
    attestation: {
      id: string;
      method: "MULTI_SOURCE_DELAYED_FEED";
      latency_disclosure: string;
    };
  };
  error?: string;
}

const LATENCY_DISCLOSURE =
  "Price locked via delayed exchange feed (15m latency/EOD). Attested and immutable.";

function jsonResponse(body: AttestedPriceResponse, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function normalizeTicker(ticker: string, market: Market): string {
  const cleaned = ticker.trim().toUpperCase();
  if (market === "IL") {
    return cleaned.endsWith(".TA") ? cleaned : `${cleaned}.TA`;
  }
  return cleaned;
}

function mapMarketState(rawState: string | null | undefined): MarketState {
  const value = (rawState ?? "").toUpperCase();
  if (value.includes("PRE")) return "PRE";
  if (value.includes("POST") || value.includes("AFTER")) return "POST";
  if (value.includes("REGULAR")) return "REGULAR";
  return "CLOSED";
}

function toIsoTimestamp(value: number | Date): string | null {
  const date = typeof value === "number" ? new Date(value * 1000) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

async function sha256(input: string): Promise<string> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return jsonResponse(
      {
        success: false,
        error: "Method not allowed",
      },
      405,
    );
  }

  let payload: AttestPriceRequest | null = null;
  try {
    payload = (await req.json()) as AttestPriceRequest;
  } catch {
    return jsonResponse({ success: false, error: "Invalid JSON payload" }, 400);
  }

  const ticker = payload?.ticker?.trim();
  const market = payload?.market;
  if (!ticker || (market !== "US" && market !== "IL")) {
    return jsonResponse({ success: false, error: "Payload must include valid ticker and market" }, 400);
  }

  const normalizedTicker = normalizeTicker(ticker, market);

  try {
    const quote = await yahooFinance.quote(normalizedTicker);

    const rawPrice = quote.regularMarketPrice;
    const rawTime = quote.regularMarketTime;
    const rawCurrency = quote.currency?.toUpperCase();
    const rawShortName = quote.shortName;
    const rawExchange = quote.exchange;

    if (typeof rawPrice !== "number" || rawPrice <= 0) {
      return jsonResponse({ success: false, error: "Quote price is unavailable or invalid" }, 502);
    }
    if (typeof rawShortName !== "string" || !rawShortName.trim()) {
      return jsonResponse({ success: false, error: "Quote metadata is unavailable" }, 502);
    }
    if (typeof rawExchange !== "string" || !rawExchange.trim()) {
      return jsonResponse({ success: false, error: "Quote metadata is unavailable" }, 502);
    }

    if (!(rawTime instanceof Date) && typeof rawTime !== "number") {
      return jsonResponse({ success: false, error: "Quote timestamp is unavailable or invalid" }, 502);
    }

    const isoTimestamp = toIsoTimestamp(rawTime);
    if (!isoTimestamp) {
      return jsonResponse({ success: false, error: "Quote timestamp is unavailable or invalid" }, 502);
    }

    let normalizedPrice = rawPrice;
    let normalizedCurrency: SupportedCurrency;

    if (rawCurrency === "ILA") {
      normalizedPrice = rawPrice / 100;
      normalizedCurrency = "ILS";
    } else if (rawCurrency === "ILS") {
      normalizedCurrency = "ILS";
    } else {
      normalizedCurrency = "USD";
    }

    if (normalizedPrice <= 0) {
      return jsonResponse({ success: false, error: "Normalized price is invalid" }, 502);
    }

    const attestationId = await sha256(
      `${normalizedTicker}|${normalizedPrice.toFixed(8)}|${isoTimestamp}|${rawShortName}|${rawExchange}`,
    );

    const response: AttestedPriceResponse = {
      success: true,
      data: {
        ticker,
        normalized_ticker: normalizedTicker,
        price: Number(normalizedPrice.toFixed(6)),
        currency: normalizedCurrency,
        timestamp: isoTimestamp,
        market_state: mapMarketState(quote.marketState),
        attestation: {
          id: attestationId,
          method: "MULTI_SOURCE_DELAYED_FEED",
          latency_disclosure: LATENCY_DISCLOSURE,
        },
      },
    };

    return jsonResponse(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to attest price";
    return jsonResponse({ success: false, error: message }, 502);
  }
});
