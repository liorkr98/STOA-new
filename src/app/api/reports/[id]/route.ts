import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { deleteChartSnapshotsForReport } from "@/lib/reports/chart-storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: reportId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sign in required" }, { status: 401 });
  }

  const { data: report } = await supabase
    .from("reports")
    .select("id, status, locked_at")
    .eq("id", reportId)
    .eq("author_id", user.id)
    .maybeSingle();

  if (!report) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }

  if (report.status !== "draft" || report.locked_at) {
    return NextResponse.json(
      { error: "only unlocked drafts can be deleted" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("reports")
    .delete()
    .eq("id", reportId)
    .eq("author_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await deleteChartSnapshotsForReport(supabase, user.id, reportId);

  revalidatePath("/studio");
  return NextResponse.json({ ok: true });
}
