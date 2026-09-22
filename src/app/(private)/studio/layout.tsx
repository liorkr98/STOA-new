import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { StudioSectionNav } from "@/components/studio/studio-section-nav";

export const dynamic = "force-dynamic";

/**
 * Studio keeps its own analyst gate; the shell (sidebar, top nav, main) now
 * comes from the parent (private) layout. The phone section tabs live here
 * because the old sticky Publishing group is gone.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "analyst" && profile.role !== "admin") redirect("/become-analyst");

  return (
    <>
      <StudioSectionNav />
      {children}
    </>
  );
}
