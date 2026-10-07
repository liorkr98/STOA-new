import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
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
  if (!requestRow) {
    return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
  }
  if (requestRow.status !== "pending" && requestRow.status !== "completed") {
    return NextResponse.json({ error: "Request is not pending" }, { status: 400 });
  }

  if (requestRow.status === "pending") {
    const { error } = await admin.rpc("approve_deletion_request", {
      p_request_id: id,
      p_admin_id: user.id,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const deletedEmail = `deleted-${requestRow.user_id.slice(0, 8)}@invalid.stoa`;
  const { error: authError } = await admin.auth.admin.updateUserById(requestRow.user_id, {
    email: deletedEmail,
    ban_duration: "876000h",
  });
  if (authError) {
    Sentry.captureException(authError, {
      extra: { deletionRequestId: id, userId: requestRow.user_id },
    });
    return NextResponse.json(
      { error: "Profile was anonymized, but the sign-in identity could not be closed. Retry this approval." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
