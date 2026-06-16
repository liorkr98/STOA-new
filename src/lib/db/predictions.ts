import { createClient } from "@/lib/supabase/server";
import type { Prediction } from "@/lib/types";

export async function listPredictionsByAuthor(
  authorId: string,
  limit = 200,
): Promise<Prediction[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("predictions")
    .select("*")
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as Prediction[]) ?? [];
}

export async function resolvedCountByAuthor(authorId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("predictions")
    .select("id", { count: "exact", head: true })
    .eq("author_id", authorId)
    .neq("outcome", "open");
  return count ?? 0;
}
