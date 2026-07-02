import { createClient } from "@/lib/supabase/server";

export interface MoatSnapshot {
  score: number;
  sample_size: number;
  wilson_win_rate: number | null;
  profit_factor: number | null;
  avg_return: number | null;
  avg_alpha: number | null;
  breakdown: Record<string, unknown> | null;
  created_at: string;
}

export interface MoatSnapshotsResponse {
  current: MoatSnapshot | null;
  previous: MoatSnapshot | null;
}

export async function getMoatSnapshots(creatorId: string): Promise<MoatSnapshotsResponse> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_moat_snapshots", {
      p_creator_id: creatorId,
    });
    if (error) throw error;
    const payload = (data ?? { current: null, previous: null }) as MoatSnapshotsResponse;
    return {
      current: payload.current ?? null,
      previous: payload.previous ?? null,
    };
  } catch {
    return { current: null, previous: null };
  }
}
