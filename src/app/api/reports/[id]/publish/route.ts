import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { withHandler } from "@/lib/http/handler";
import { ApiError } from "@/lib/http/errors";
import { PublishReportError, validateAndPublishReport } from "@/lib/reports/publish-report";
import type { ComposeInput } from "@/lib/types";

export const POST = withHandler<{ id: string }>(
  {
    route: "POST /api/reports/[id]/publish",
    auth: "required",
    idempotency: { scope: "report-publish" },
    rateLimit: { name: "report-publish", limit: 30, windowSeconds: 60, by: "user" },
  },
  async ({ req, user, params }) => {
    const routeId = params.id;
    const supabase = await createClient();

    let body: ComposeInput;
    try {
      body = (await req.json()) as ComposeInput;
    } catch {
      throw new ApiError("bad_request", "invalid json");
    }

    if (routeId && body.id && routeId !== body.id) {
      throw new ApiError("bad_request", "report id mismatch");
    }

    try {
      const result = await validateAndPublishReport(supabase, user!.id, {
        ...body,
        id: routeId || body.id,
      });
      revalidatePath("/");
      revalidatePath("/home");
      revalidatePath("/feed");
      revalidatePath("/studio");
      return NextResponse.json({ ok: true, id: result.id });
    } catch (e) {
      if (e instanceof PublishReportError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      throw e;
    }
  },
);
