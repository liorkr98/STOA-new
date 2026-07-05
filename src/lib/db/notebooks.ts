import { createClient } from "@/lib/supabase/server";

/**
 * Notebooks + entries (Part F). Owner-private research workspace. The only place
 * notebook data is read/written; RLS scopes everything to the owner.
 */

export type EntryKind = "snippet" | "figure" | "chart" | "kpi" | "report" | "note";

export interface Notebook {
  id: string;
  owner_id: string;
  title: string;
  created_at: string;
  entry_count?: number;
}

export interface EntrySource {
  url?: string;
  title?: string;
  accession?: string;
  ticker?: string;
  asOf?: string;
}

export interface NotebookEntry {
  id: string;
  notebook_id: string;
  kind: EntryKind;
  payload: Record<string, unknown>;
  source: EntrySource | null;
  tags: string[];
  color: string | null;
  created_at: string;
}

const ENTRY_COLUMNS = "id, notebook_id, kind, payload, source, tags, color, created_at";

export async function listNotebooks(): Promise<Notebook[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("notebooks")
    .select("id, owner_id, title, created_at, notebook_entries(count)")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data.map((n) => {
    const countRel = (n as { notebook_entries?: { count: number }[] }).notebook_entries;
    return {
      id: n.id as string,
      owner_id: n.owner_id as string,
      title: n.title as string,
      created_at: n.created_at as string,
      entry_count: Array.isArray(countRel) ? (countRel[0]?.count ?? 0) : 0,
    };
  });
}

export async function createNotebook(title: string): Promise<Notebook | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("notebooks")
    .insert({ owner_id: user.id, title })
    .select("id, owner_id, title, created_at")
    .maybeSingle();
  if (error || !data) return null;
  return data as Notebook;
}

export async function renameNotebook(id: string, title: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("notebooks").update({ title }).eq("id", id);
  return !error;
}

export async function deleteNotebook(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("notebooks").delete().eq("id", id);
  return !error;
}

export async function listEntries(notebookId: string): Promise<NotebookEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notebook_entries")
    .select(ENTRY_COLUMNS)
    .eq("notebook_id", notebookId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as NotebookEntry[];
}

export interface EntryInput {
  kind: EntryKind;
  payload: Record<string, unknown>;
  source?: EntrySource | null;
  tags?: string[];
  color?: string | null;
}

export async function addEntry(notebookId: string, input: EntryInput): Promise<NotebookEntry | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notebook_entries")
    .insert({
      notebook_id: notebookId,
      kind: input.kind,
      payload: input.payload,
      source: input.source ?? null,
      tags: input.tags ?? [],
      color: input.color ?? null,
    })
    .select(ENTRY_COLUMNS)
    .maybeSingle();
  if (error || !data) return null;
  return data as NotebookEntry;
}

export async function updateEntry(
  id: string,
  patch: Partial<Pick<NotebookEntry, "tags" | "color" | "payload">>,
): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("notebook_entries").update(patch).eq("id", id);
  return !error;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("notebook_entries").delete().eq("id", id);
  return !error;
}
