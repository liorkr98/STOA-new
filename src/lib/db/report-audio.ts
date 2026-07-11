import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AudioBriefMode } from "@/lib/ai/audio/pricing";

export interface ReportAudioBriefRow {
  id: string;
  report_id: string;
  voice_id: string;
  mode: AudioBriefMode;
  storage_path: string;
  script_text: string;
  script_chars: number;
  content_hash: string | null;
  credits_charged: number;
  generated_by: string | null;
  duration_estimate_sec: number | null;
  created_at: string;
}

export function audioStoragePath(reportId: string, voiceId: string): string {
  return `${reportId}/${voiceId}.mp3`;
}

export async function getCachedAudioBrief(
  reportId: string,
  voiceId: string,
): Promise<ReportAudioBriefRow | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("report_audio_briefs")
    .select("*")
    .eq("report_id", reportId)
    .eq("voice_id", voiceId)
    .maybeSingle();
  return (data as ReportAudioBriefRow | null) ?? null;
}

export async function listCachedAudioBriefs(reportId: string): Promise<ReportAudioBriefRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("report_audio_briefs")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  return (data as ReportAudioBriefRow[]) ?? [];
}

export async function saveCachedAudioBrief(row: {
  reportId: string;
  voiceId: string;
  mode: AudioBriefMode;
  storagePath: string;
  scriptText: string;
  scriptChars: number;
  contentHash: string | null;
  creditsCharged: number;
  generatedBy: string;
  durationEstimateSec: number;
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("report_audio_briefs").upsert(
    {
      report_id: row.reportId,
      voice_id: row.voiceId,
      mode: row.mode,
      storage_path: row.storagePath,
      script_text: row.scriptText,
      script_chars: row.scriptChars,
      content_hash: row.contentHash,
      credits_charged: row.creditsCharged,
      generated_by: row.generatedBy,
      duration_estimate_sec: row.durationEstimateSec,
    },
    { onConflict: "report_id,voice_id" },
  );
  if (error) throw new Error(error.message);
}

export async function mintAudioSignedUrl(
  storagePath: string,
  ttlSeconds: number,
): Promise<string | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("report-audio")
    .createSignedUrl(storagePath, ttlSeconds);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
