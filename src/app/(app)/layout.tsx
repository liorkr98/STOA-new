import { getSessionProfile } from "@/lib/db/auth";
import { unreadNotificationCount } from "@/lib/db/notifications";
import { TopNav } from "@/components/layout/top-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  const unreadCount = profile ? await unreadNotificationCount(profile.id) : 0;
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <TopNav profile={profile} unreadCount={unreadCount} />
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-8">{children}</main>
    </div>
  );
}
