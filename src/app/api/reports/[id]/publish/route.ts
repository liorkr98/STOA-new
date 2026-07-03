import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PublishReportError, validateAndPublishReport } from "@/lib/reports/publish-report";
import type { ComposeInput } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: routeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  let body: ComposeInput;
  try {
    body = (await request.json()) as ComposeInput;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (routeId && body.id && routeId !== body.id) {
    return NextResponse.json({ error: "report id mismatch" }, { status: 400 });
  }

  try {
    const result = await validateAndPublishReport(supabase, user.id, { ...body, id: routeId || body.id });
    revalidatePath("/discover");
    revalidatePath("/studio");
    return NextResponse.json({ ok: true, id: result.id });
  } catch (e) {
    if (e instanceof PublishReportError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "publish failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
