import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { alertVercelSpend } from "@/lib/slack/alerts";
import { claimWebhookEvent } from "@/lib/webhooks/idempotency";
import { normalizeSecret } from "@/lib/webhooks/secret";
import {
  parseVercelSpendBody,
  verifyVercelSpendSignature,
} from "@/lib/webhooks/vercel-spend";

/**
 * Vercel Spend Management webhook. Team on-demand budget hits 50 / 75 / 100
 * and POSTs here. The pause itself is configured on the budget (CLI); this
 * route only pages #ops so a cap event is not silent.
 *
 * Signature: HMAC-SHA1 of the raw body, hex, header `x-vercel-signature`.
 * Secret is printed once when the webhook is first saved on the budget.
 */

export async function POST(req: Request) {
  const secret = normalizeSecret(process.env.VERCEL_SPEND_WEBHOOK_SECRET);
  if (!secret) {
    Sentry.captureMessage("Vercel spend webhook rejected: secret not configured", {
      level: "error",
    });
    return NextResponse.json({ error: "secret not configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-vercel-signature");
  if (!verifyVercelSpendSignature(rawBody, signature, secret)) {
    Sentry.captureMessage("Vercel spend webhook rejected: bad signature", {
      level: "warning",
    });
    return NextResponse.json({ error: "bad signature" }, { status: 401 });
  }

  const event = parseVercelSpendBody(rawBody);
  if (!event) return NextResponse.json({ error: "unrecognized payload" }, { status: 400 });

  try {
    await alertVercelSpend(event);
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ error: "alert failed" }, { status: 500 });
  }

  await claimWebhookEvent("vercel-spend", event.id).catch(() => true);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({
    endpoint: "vercel-spend",
    method: "POST",
    secretConfigured: Boolean(normalizeSecret(process.env.VERCEL_SPEND_WEBHOOK_SECRET)),
  });
}
