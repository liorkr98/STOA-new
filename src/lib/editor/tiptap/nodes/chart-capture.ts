"use client";

import type { Editor } from "@tiptap/react";
import { createClient } from "@/lib/supabase/client";
import { getChartHandle } from "./chart-registry";

const BUCKET = "chart-snapshots";

/**
 * Capture a PNG of every chartNode in the document and upload it to the
 * chart-snapshots bucket, then write each public URL back onto its node's
 * screenshotUrl attr in a single transaction. Runs between "Lock it in" and
 * the publish call. A failed capture or upload never blocks publish -- the
 * reading view falls back to the live chart when screenshotUrl is null.
 */
export async function captureChartScreenshots(editor: Editor, reportId: string): Promise<void> {
  const charts: { nodeId: string; pos: number; attrs: Record<string, unknown> }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "chartNode") {
      const nodeId = String(node.attrs.nodeId ?? "");
      if (nodeId) charts.push({ nodeId, pos, attrs: node.attrs });
    }
  });
  if (charts.length === 0) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const updates: { pos: number; attrs: Record<string, unknown>; url: string }[] = [];
  for (const chart of charts) {
    try {
      const handle = getChartHandle(chart.nodeId);
      if (!handle) continue;
      const blob = await handle.takeScreenshot();
      if (!blob) continue;
      const path = `${user.id}/${reportId}/${chart.nodeId}.png`;
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, blob, { contentType: "image/png", upsert: true });
      if (error) continue;
      const url = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      updates.push({ pos: chart.pos, attrs: chart.attrs, url });
    } catch {
      // Swallow -- a missing screenshot is recoverable, a blocked publish is not.
    }
  }

  if (updates.length === 0) return;
  const { tr } = editor.state;
  for (const u of updates) {
    tr.setNodeMarkup(u.pos, undefined, { ...u.attrs, screenshotUrl: u.url });
  }
  editor.view.dispatch(tr);
}
