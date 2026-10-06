import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Admin: approve a pending erasure request, then blank the auth email. */
export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: requestRow } = await admin
    .from("deletion_requests")
    .select("user_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!requestRow || requestRow.status !== "pending") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
  }

  const { error } = await admin.rpc("approve_deletion_request", {
    p_request_id: id,
    p_admin_id: user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const deletedEmail = `deleted-${requestRow.user_id.slice(0, 8)}@invalid.stoa`;
  await admin.auth.admin.updateUserById(requestRow.user_id, {
    email: deletedEmail,
    ban_duration: "876000h",
  });

  return NextResponse.json({ ok: true });
}
