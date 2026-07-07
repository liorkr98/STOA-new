import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/server";
import { normalizePromptInput } from "@/lib/ai/prompt-safety";
import { NapkinApiError, napkinGenerateAndDownload } from "@/lib/napkin/client";
import { NAPKIN_DEFAULT_STYLE_ID } from "@/lib/napkin/styles";

const BUCKET = "report-images";

/**
 * Generate a Napkin visual from analyst text, download it, and host on Supabase
 * storage so the report body stays self-contained at publish time.
 */
export async function POST(req: Request) {
  const token = process.env.NAPKIN_API_KEY?.trim();
  if (!token) {
    return NextResponse.json(
      {
        error:
          "Napkin is not configured on this deployment. In Vercel, add NAPKIN_API_KEY to the stoa-new project (link the team variable to the project if using shared env), then redeploy.",
      },
      { status: 503 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json()) as {
    content?: string;
    context_before?: string;
    context_after?: string;
    style_id?: string;
    visual_query?: string;
    format?: "svg" | "png";
    number_of_visuals?: number;
  };

  const content = normalizePromptInput(body.content ?? "", 4_000);
  if (!content.trim()) {
    return NextResponse.json({ error: "Content is required to generate a visual" }, { status: 400 });
  }

  const format = body.format === "png" ? "png" : "svg";
  const numberOfVisuals = Math.min(4, Math.max(1, body.number_of_visuals ?? 2));
  const visualQuery = body.visual_query?.trim() || undefined;

  try {
    const { requestId, files, buffers } = await napkinGenerateAndDownload(token, {
      format,
      content,
      context_before: body.context_before
        ? normalizePromptInput(body.context_before, 500)
        : "Equity research report excerpt:",
      context_after: body.context_after
        ? normalizePromptInput(body.context_after, 500)
        : "for institutional investors",
      language: "en-US",
      style_id: body.style_id?.trim() || NAPKIN_DEFAULT_STYLE_ID,
      number_of_visuals: numberOfVisuals,
      ...(visualQuery ? { visual_query: visualQuery } : {}),
      transparent_background: format === "png",
      width: format === "png" ? 1200 : undefined,
    });

    const hosted: { url: string; fileId?: string }[] = [];
    const ext = format === "png" ? "png" : "svg";
    const contentType = format === "png" ? "image/png" : "image/svg+xml";

    for (let i = 0; i < buffers.length; i++) {
      const path = `${user.id}/napkin/${nanoid(10)}-${i}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffers[i], { contentType, upsert: true });
      if (upErr) {
        return NextResponse.json({ error: "Failed to store visual" }, { status: 500 });
      }
      const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      hosted.push({ url: publicUrl, fileId: files[i]?.id });
    }

    return NextResponse.json({
      request_id: requestId,
      visuals: hosted,
    });
  } catch (e) {
    if (e instanceof NapkinApiError) {
      const status = e.status === 401 ? 503 : e.status >= 400 && e.status < 600 ? e.status : 502;
      return NextResponse.json({ error: e.message }, { status });
    }
    const message = e instanceof Error ? e.message : "Napkin generation failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
