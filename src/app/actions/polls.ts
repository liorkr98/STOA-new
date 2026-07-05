"use server";

import { revalidatePath } from "next/cache";
import {
  createPoll as dbCreatePoll,
  deletePoll as dbDeletePoll,
  votePoll as dbVotePoll,
  type PollKind,
} from "@/lib/db/polls";

/** Poll server actions (H3). Thin wrappers; RLS is the enforcement layer. */

export async function createPollAction(input: {
  question: string;
  kind: PollKind;
  options: string[];
  ticker?: string | null;
  reportId?: string | null;
  minPlanRank?: number;
  closesAt?: string | null;
}): Promise<{ id: string } | { error: string }> {
  const question = input.question.trim();
  if (!question) return { error: "Question is required" };
  const options = input.options.map((o) => o.trim()).filter(Boolean);
  if (options.length < 2) return { error: "At least two options" };

  const id = await dbCreatePoll({
    question,
    kind: input.kind,
    options,
    ticker: input.ticker,
    report_id: input.reportId,
    min_plan_rank: input.minPlanRank,
    closes_at: input.closesAt,
  });
  if (!id) return { error: "Could not create poll" };
  revalidatePath("/studio/polls");
  return { id };
}

export async function votePollAction(pollId: string, optionId: string): Promise<boolean> {
  return dbVotePoll(pollId, optionId);
}

export async function deletePollAction(pollId: string): Promise<boolean> {
  const ok = await dbDeletePoll(pollId);
  revalidatePath("/studio/polls");
  return ok;
}
