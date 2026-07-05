"use server";

import { revalidatePath } from "next/cache";
import {
  addEntry,
  createNotebook,
  deleteEntry,
  deleteNotebook,
  listEntries,
  listNotebooks,
  renameNotebook,
  updateEntry,
  type EntryInput,
  type Notebook,
  type NotebookEntry,
} from "@/lib/db/notebooks";

/**
 * Notebook server actions (Part F). Includes saveToNotebook, the shared capture
 * action wired to every "Save to Notebook" surface (report reader selection,
 * data blocks, transcript lines, Copilot answers).
 */

function revalidateNotebooks() {
  revalidatePath("/notebook");
  revalidatePath("/studio/notebook");
}

export async function listEntriesAction(notebookId: string): Promise<NotebookEntry[]> {
  return listEntries(notebookId);
}

export async function createNotebookAction(title: string): Promise<Notebook | null> {
  const nb = await createNotebook(title.trim() || "Untitled notebook");
  revalidateNotebooks();
  return nb;
}

export async function renameNotebookAction(id: string, title: string): Promise<boolean> {
  const ok = await renameNotebook(id, title);
  revalidateNotebooks();
  return ok;
}

export async function deleteNotebookAction(id: string): Promise<boolean> {
  const ok = await deleteNotebook(id);
  revalidateNotebooks();
  return ok;
}

export async function addEntryAction(
  notebookId: string,
  input: EntryInput,
): Promise<NotebookEntry | null> {
  const entry = await addEntry(notebookId, input);
  revalidateNotebooks();
  return entry;
}

export async function updateEntryAction(
  id: string,
  patch: Partial<Pick<NotebookEntry, "tags" | "color" | "payload">>,
): Promise<boolean> {
  const ok = await updateEntry(id, patch);
  revalidateNotebooks();
  return ok;
}

export async function deleteEntryAction(id: string): Promise<boolean> {
  const ok = await deleteEntry(id);
  revalidateNotebooks();
  return ok;
}

/**
 * Save a snippet/figure/chart/etc into a notebook. With no notebookId, drops it
 * into the owner's default "Saved" notebook (created on first use). This is the
 * one entry point every capture surface calls.
 */
export async function saveToNotebookAction(
  input: EntryInput,
  notebookId?: string,
): Promise<NotebookEntry | null> {
  let targetId = notebookId;
  if (!targetId) {
    const existing = await listNotebooks();
    const saved = existing.find((n) => n.title === "Saved");
    targetId = saved?.id ?? (await createNotebook("Saved"))?.id;
  }
  if (!targetId) return null;
  const entry = await addEntry(targetId, input);
  revalidateNotebooks();
  return entry;
}
