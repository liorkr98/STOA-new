import { getSessionProfile } from "@/lib/db/auth";
import { TopNav } from "@/components/layout/top-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopNav profile={profile} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
