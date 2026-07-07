import { z } from "zod";

/** OpenNapkinAI-style structured output (4 bullet points around a template). */
export const BulletPointSchema = z.object({
  title: z.string().min(3).max(50),
  content: z.string().min(10).max(200),
});

export const BulletPointsResponseSchema = z.object({
  bulletPoints: z.array(BulletPointSchema).length(4),
});

export type BulletPoint = z.infer<typeof BulletPointSchema>;
export type BulletPointsResponse = z.infer<typeof BulletPointsResponseSchema>;

export const DIAGRAM_IDS = [
  "stacked",
  "arrow",
  "diamond",
  "puzzle",
  "radial",
  "pinwheel",
  "eight",
  "pyramid",
] as const;

export type DiagramId = (typeof DIAGRAM_IDS)[number];

export const DIAGRAM_THEMES = [
  "default",
  "ocean",
  "sunset",
  "forest",
  "nordic",
  "neon",
  "elegant",
  "blue",
  "green",
  "red",
  "purple",
  "orange",
  "teal",
  "grey",
  "gold",
] as const;

export type DiagramTheme = (typeof DIAGRAM_THEMES)[number];
