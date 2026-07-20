import { ApiError } from "./errors";

/**
 * fetch with an explicit timeout via AbortController. A hung upstream (market
 * data, LLM, PayPal) must not tie up a serverless function for its whole
 * duration - it should fail fast with a retryable `upstream_timeout` so the
 * caller (and a mobile client) can react deterministically.
 */
export async function fetchWithTimeout(
  input: string | URL | Request,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 8000, signal, ...rest } = init;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Respect a caller-supplied signal in addition to the timeout.
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }

  try {
    return await fetch(input, { ...rest, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ApiError("upstream_timeout", "Upstream request timed out");
    }
    throw new ApiError("upstream_error", "Upstream request failed");
  } finally {
    clearTimeout(timer);
  }
}
