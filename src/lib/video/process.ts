import "server-only";

import {
  getBunnyVideo,
  requestBunnyCaptions,
  fetchTranscriptFromVtt,
} from "@/lib/video/bunny";
import { setVideoClipTranscriptByGuid } from "@/lib/db/video-clips";

/**
 * Post-processing for a finished Bunny video (Part 2.4/2.5): ensure captions
 * exist, then cache the transcript for the fact-checker. Extracted so the Bunny
 * webhook can either run it inline (no queue) or hand it to the video-process
 * QStash consumer. Idempotent: re-running only re-requests captions or re-caches
 * the same transcript.
 */
export async function processReadyVideo(guid: string): Promise<void> {
  const video = await getBunnyVideo(guid);
  if (!video.captions || video.captions.length === 0) {
    await requestBunnyCaptions(guid);
    return;
  }
  const transcript = await fetchTranscriptFromVtt(guid);
  if (transcript) await setVideoClipTranscriptByGuid(guid, transcript);
}
