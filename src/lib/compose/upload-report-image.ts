"use client";

import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";

const BUCKET = "report-images";

/**
 * Store a compose image in the report-images bucket and return its public URL.
 * A local object URL only renders in this tab; saving it stores a dead link.
 */
export async function uploadReportImage(file: File): Promise<string> {
  if (file.size < 1) throw new Error("That image file is empty.");
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to upload.");
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${user.id}/${nanoid(12)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "image/png",
    upsert: true,
  });
  if (error) throw new Error("Could not store that image. Try again.");
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
