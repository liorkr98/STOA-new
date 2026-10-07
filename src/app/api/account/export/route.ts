import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, rateLimitHeaders } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** GDPR data portability: JSON bundle of the requesting user's own data. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to continue" }, { status: 401 });
  }

  const userId = user.id;
  const rl = await rateLimit("export", userId, { limit: 5, windowSeconds: 3600 });
  if (!rl.success) {
    return NextResponse.json(
      { error: "Export limit reached. Try again later." },
      { status: 429, headers: rateLimitHeaders(rl) },
    );
  }

  const [
    profileRes,
    consentsRes,
    reportsRes,
    subscriptionsRes,
    unlocksRes,
    walletRes,
    followsRes,
    followingRes,
    savedRes,
    commentsRes,
    debateRes,
    paypalRes,
    clipsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("user_consents")
      .select("accepted_at, ip_address, legal_document:legal_documents(doc_type, version, effective_at)")
      .eq("user_id", userId),
    supabase
      .from("reports")
      .select("id, type, title, status, access, ticker, published_at, created_at")
      .eq("author_id", userId),
    supabase
      .from("subscriptions")
      .select("analyst_id, status, renews_at, created_at")
      .eq("subscriber_id", userId),
    supabase.from("report_unlocks").select("report_id, created_at").eq("user_id", userId),
    supabase.from("wallets").select("balance, created_at").eq("owner_id", userId).maybeSingle(),
    supabase.from("follows").select("analyst_id, created_at").eq("follower_id", userId),
    supabase.from("follows").select("follower_id, created_at").eq("analyst_id", userId),
    supabase.from("saved_reports").select("report_id, created_at").eq("user_id", userId),
    supabase.from("comments").select("id, report_id, body, created_at").eq("author_id", userId),
    supabase.from("debate_comments").select("id, claim_id, body, created_at").eq("author_id", userId),
    supabase
      .from("paypal_accounts")
      .select("status, payments_receivable, primary_email_confirmed, onboarded_at")
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("video_clips")
      .select("id, play_count, completion_count, click_through_count, created_at")
      .eq("creator_id", userId),
  ]);

  const bundle = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    email: user.email,
    marketing_opt_in: Boolean(profileRes.data && "marketing_opt_in" in profileRes.data
      ? (profileRes.data as { marketing_opt_in?: boolean }).marketing_opt_in
      : false),
    profile: profileRes.data,
    consents: consentsRes.data ?? [],
    reports_authored: reportsRes.data ?? [],
    subscriptions: subscriptionsRes.data ?? [],
    report_unlocks: unlocksRes.data ?? [],
    wallet: walletRes.data,
    following: followsRes.data ?? [],
    followers: followingRes.data ?? [],
    saved_reports: savedRes.data ?? [],
    comments: commentsRes.data ?? [],
    debate_comments: debateRes.data ?? [],
    paypal: paypalRes.data
      ? { connected: true, status: paypalRes.data.status, onboarded_at: paypalRes.data.onboarded_at }
      : { connected: false },
    video_stats: clipsRes.data ?? [],
  };

  return NextResponse.json(bundle, {
    headers: {
      "Content-Disposition": `attachment; filename="stoa-export-${userId.slice(0, 8)}.json"`,
      ...rateLimitHeaders(rl),
    },
  });
}
