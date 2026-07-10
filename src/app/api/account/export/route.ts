import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** GDPR data portability — JSON bundle of the requesting user's own data. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const userId = user.id;

  const [
    profileRes,
    consentsRes,
    reportsRes,
    subscriptionsRes,
    unlocksRes,
    walletRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("user_consents")
      .select("accepted_at, ip_address, legal_document:legal_documents(doc_type, version, effective_at)")
      .eq("user_id", userId),
    supabase.from("reports").select("id, type, title, status, access, ticker, published_at, created_at").eq("author_id", userId),
    supabase.from("subscriptions").select("analyst_id, status, renews_at, created_at").eq("subscriber_id", userId),
    supabase.from("report_unlocks").select("report_id, created_at").eq("user_id", userId),
    supabase.from("wallets").select("balance, created_at").eq("owner_id", userId).maybeSingle(),
  ]);

  const bundle = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    email: user.email,
    profile: profileRes.data,
    consents: consentsRes.data ?? [],
    reports_authored: reportsRes.data ?? [],
    subscriptions: subscriptionsRes.data ?? [],
    report_unlocks: unlocksRes.data ?? [],
    wallet: walletRes.data,
  };

  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition": `attachment; filename="stoa-export-${userId.slice(0, 8)}.json"`,
    },
  });
}
