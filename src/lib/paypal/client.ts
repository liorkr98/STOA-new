/**
 * PayPal REST API client. No SDK dependency — PayPal's REST API is plain
 * JSON over fetch, same pattern already used for OpenAI in this codebase.
 *
 * Sandbox vs live is controlled by PAYPAL_MODE (defaults to sandbox, so a
 * misconfigured deployment never accidentally hits live money).
 */

const BASE_URL = process.env.PAYPAL_MODE === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

export function isPayPalConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function requireCredentials() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set. Add them to .env.local to enable creator payouts.",
    );
  }
  return { clientId, clientSecret };
}

/** OAuth2 client-credentials token, cached until ~60s before expiry. */
async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.accessToken;
  }

  const { clientId, clientSecret } = requireCredentials();
  const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    throw new Error(`PayPal OAuth failed: ${res.status} ${await res.text()}`);
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { accessToken: json.access_token, expiresAt: Date.now() + (json.expires_in - 60) * 1000 };
  return cachedToken.accessToken;
}

/** Generic authenticated PayPal REST call. Throws with the response body on non-2xx for easy debugging. */
export async function paypalFetch<T>(
  path: string,
  options: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(process.env.PAYPAL_BN_CODE ? { "PayPal-Partner-Attribution-Id": process.env.PAYPAL_BN_CODE } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`PayPal API ${options.method ?? "GET"} ${path} failed: ${res.status} ${text}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

export { BASE_URL as PAYPAL_BASE_URL };
