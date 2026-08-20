import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";

export const dynamic = "force-dynamic";

/**
 * Studio keeps its own analyst gate; the shell (sidebar, top nav, main) now
 * comes from the parent (private) layout, so this layout only guards access.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "analyst" && profile.role !== "admin") redirect("/become-analyst");

  return <>{children}</>;
}
