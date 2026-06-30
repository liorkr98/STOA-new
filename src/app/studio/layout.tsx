import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";
import { StudioSidebar } from "@/components/layout/studio-sidebar";

export const dynamic = "force-dynamic";

export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role !== "analyst" && profile.role !== "admin") redirect("/become-analyst");

  return (
    <div className="flex min-h-[100dvh]">
      <StudioSidebar profile={profile} />
      <main className="flex-1 px-5 py-8 md:px-8">{children}</main>
    </div>
  );
}
