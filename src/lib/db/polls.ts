import { createClient } from "@/lib/supabase/server";

/**
 * Community polls (H3). The only place poll data is read/written. RLS enforces:
 * plan-rank gated reads, creator-only writes, one vote per user, no votes after
 * closes_at. Polls are community sentiment -- they never feed the scoring cron
 * and never render as ledger cards.
 */

export type PollKind = "sentiment" | "choice" | "coverage" | "target";

export interface PollOption {
  id: string;
  label: string;
  sort: number;
  votes: number;
}

export interface Poll {
  id: string;
  creator_id: string;
  report_id: string | null;
  question: string;
  kind: PollKind;
  ticker: string | null;
  min_plan_rank: number;
  closes_at: string | null;
  created_at: string;
  options: PollOption[];
  total_votes: number;
  my_option_id: string | null;
}

interface OptionRow {
  id: string;
  label: string;
  sort: number | null;
}

async function hydrate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: {
    id: string;
    creator_id: string;
    report_id: string | null;
    question: string;
    kind: PollKind;
    ticker: string | null;
    min_plan_rank: number;
    closes_at: string | null;
    created_at: string;
    poll_options: OptionRow[];
  }[],
): Promise<Poll[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const { data: votes } = await supabase
    .from("poll_votes")
    .select("poll_id, option_id")
    .in("poll_id", ids);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const mine = new Map<string, string>();
  if (user) {
    const { data: myVotes } = await supabase
      .from("poll_votes")
      .select("poll_id, option_id")
      .in("poll_id", ids)
      .eq("voter_id", user.id);
    for (const v of myVotes ?? []) mine.set(v.poll_id as string, v.option_id as string);
  }

  const tally = new Map<string, number>();
  for (const v of votes ?? []) {
    const key = String(v.option_id);
    tally.set(key, (tally.get(key) ?? 0) + 1);
  }

  return rows.map((r) => {
    const options = [...(r.poll_options ?? [])]
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))
      .map((o) => ({ id: o.id, label: o.label, sort: o.sort ?? 0, votes: tally.get(o.id) ?? 0 }));
    return {
      ...r,
      options,
      total_votes: options.reduce((a, o) => a + o.votes, 0),
      my_option_id: mine.get(r.id) ?? null,
    };
  });
}

const SELECT = "id, creator_id, report_id, question, kind, ticker, min_plan_rank, closes_at, created_at, poll_options(id, label, sort)";

export async function listPollsByCreator(creatorId: string, limit = 10): Promise<Poll[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select(SELECT)
    .eq("creator_id", creatorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return hydrate(supabase, data as never);
}

export async function listPollsByReport(reportId: string): Promise<Poll[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("polls")
    .select(SELECT)
    .eq("report_id", reportId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return hydrate(supabase, data as never);
}

export async function createPoll(input: {
  question: string;
  kind: PollKind;
  options: string[];
  ticker?: string | null;
  report_id?: string | null;
  min_plan_rank?: number;
  closes_at?: string | null;
}): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: poll, error } = await supabase
    .from("polls")
    .insert({
      creator_id: user.id,
      question: input.question,
      kind: input.kind,
      ticker: input.ticker?.toUpperCase() ?? null,
      report_id: input.report_id ?? null,
      min_plan_rank: input.min_plan_rank ?? 0,
      closes_at: input.closes_at ?? null,
    })
    .select("id")
    .maybeSingle();
  if (error || !poll) return null;

  const rows = input.options
    .map((label, i) => ({ poll_id: poll.id as string, label: label.trim(), sort: i }))
    .filter((o) => o.label);
  if (rows.length >= 2) {
    await supabase.from("poll_options").insert(rows);
  }
  return poll.id as string;
}

/** Vote (or change a vote). RLS rejects votes on closed polls. */
export async function votePoll(pollId: string, optionId: string): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  await supabase.from("poll_votes").delete().eq("poll_id", pollId).eq("voter_id", user.id);
  const { error } = await supabase
    .from("poll_votes")
    .insert({ poll_id: pollId, option_id: optionId, voter_id: user.id });
  return !error;
}

export async function deletePoll(pollId: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("polls").delete().eq("id", pollId);
  return !error;
}
