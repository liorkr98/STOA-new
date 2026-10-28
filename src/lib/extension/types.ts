import { z } from "zod";

/**
 * One ticker in one video, as the extension draws it. The extension keeps a
 * copy of this type (extension/src/lib/types.ts); keep the two in step.
 */
export type VideoTicker = {
  ticker: string;
  name: string;
  /** A few words on what the company is. */
  what: string | null;
  etf: boolean;
  /** "card" pops up beside the video; "line" only joins the In this video line. */
  kind: "card" | "line";
  /** Seconds into the video: the stretch the card belongs to. */
  start: number;
  end: number;
  stance: "bull" | "bear" | null;
  conditional: boolean;
};

/** What is stored per video: derived results only, never the transcript. */
export type VideoTickerIndex = {
  videoId: string;
  language: string;
  items: VideoTicker[];
  model: string;
  detectedAt: string;
};

export const MAX_SEGMENTS = 6000;
/** About three hours of speech. Longer transcripts are refused before any AI read. */
export const MAX_TRANSCRIPT_CHARS = 150_000;
const MAX_TEXT = 400;

export const DetectRequestSchema = z.object({
  videoId: z.string().regex(/^[\w-]{11}$/),
  language: z.string().min(2).max(12),
  segments: z
    .array(
      z.object({
        start: z.number().min(0).max(86_400),
        end: z.number().min(0).max(86_400),
        text: z.string().max(MAX_TEXT),
      }),
    )
    .min(1)
    .max(MAX_SEGMENTS),
});

export type DetectRequest = z.infer<typeof DetectRequestSchema>;
