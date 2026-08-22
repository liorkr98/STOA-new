import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { listEntries, listNotebooks } from "@/lib/db/notebooks";
import { NotebookBoard } from "@/components/notebook/notebook-board";

/**
 * Investor Notebook (Part F). A private research workspace: collect snippets,
 * figures, and charts saved while reading, then compose a report from them.
 */
export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");

  const notebooks = await listNotebooks();
  const first = notebooks[0];
  const entries = first ? await listEntries(first.id) : [];

  return (
    <div className="mx-auto w-full max-w-[var(--w-standard)]">
      <NotebookBoard
        notebooks={notebooks}
        initialNotebookId={first?.id}
        initialEntries={entries}
        mode="investor"
      />
    </div>
  );
}
