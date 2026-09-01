import { uploadToBunnyTus, type BunnyUploadSession } from "@/lib/video/tus-upload";

interface UploadSession {
  clipId: string;
  guid: string;
  upload: BunnyUploadSession;
  error?: string;
}

/**
 * Attaches a clip a creator chose in Compose to a report that is already
 * locked. The upload route requires the report to exist and be locked first
 * (video_clips.report_id is NOT NULL), which is why this runs after publish
 * rather than alongside the draft save.
 */
export async function uploadComposeClip(input: {
  reportId: string;
  file: File;
  title: string;
  durationSeconds: number;
  onProgress?: (percent: number) => void;
}): Promise<{ clipId: string }> {
  const res = await fetch("/api/creator/videos/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reportId: input.reportId,
      title: input.title,
      durationSeconds: Math.round(input.durationSeconds),
    }),
  });
  const data = (await res.json()) as UploadSession;
  if (!res.ok) throw new Error(data.error ?? "Could not start the video upload.");

  await uploadToBunnyTus(
    input.file,
    data.upload,
    {
      title: input.title.slice(0, 200) || input.file.name,
      filetype: input.file.type || "video/mp4",
    },
    input.onProgress,
  );

  return { clipId: data.clipId };
}
