import { NextResponse } from "next/server";
import { handleBugsChannelMessage } from "@/lib/slack/bug-handler";
import { verifySlackRequestSignature } from "@/lib/slack/verify-signature";

export const dynamic = "force-dynamic";

type SlackEnvelope = {
  type: string;
  challenge?: string;
  event?: {
    type: string;
    subtype?: string;
    channel: string;
    user?: string;
    bot_id?: string;
    text?: string;
    ts: string;
  };
};

export async function POST(request: Request) {
  const signingSecret = process.env.SLACK_SIGNING_SECRET?.trim();
  const rawBody = await request.text();

  if (signingSecret) {
    const ok = verifySlackRequestSignature(
      signingSecret,
      rawBody,
      request.headers.get("x-slack-request-timestamp"),
      request.headers.get("x-slack-signature"),
    );
    if (!ok) {
      return NextResponse.json({ error: "invalid signature" }, { status: 401 });
    }
  }

  let body: SlackEnvelope;
  try {
    body = JSON.parse(rawBody) as SlackEnvelope;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (body.type === "url_verification" && body.challenge) {
    return NextResponse.json({ challenge: body.challenge });
  }

  if (body.type === "event_callback" && body.event) {
    void handleBugsChannelMessage(body.event).catch(() => null);
  }

  return NextResponse.json({ ok: true });
}
