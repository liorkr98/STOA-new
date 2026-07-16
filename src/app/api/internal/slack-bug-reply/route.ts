import { NextResponse } from "next/server";
import { postBugFixReply } from "@/lib/slack/bug-handler";
import { cronSecret } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";

/** Agent or automation posts a fix summary as a thread reply on #bugs. */
export async function POST(request: Request) {
  const secret = cronSecret();
  const auth = request.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { channelId?: string; threadTs?: string; message?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { channelId, threadTs, message } = body;
  if (!channelId?.trim() || !threadTs?.trim() || !message?.trim()) {
    return NextResponse.json({ error: "channelId, threadTs, and message required" }, { status: 400 });
  }

  const ok = await postBugFixReply({
    channelId: channelId.trim(),
    threadTs: threadTs.trim(),
    message: message.trim(),
  });

  if (!ok) {
    return NextResponse.json(
      { error: "Slack reply failed. Check SLACK_BOT_TOKEN and bot scopes." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
