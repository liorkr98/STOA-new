import { getSessionProfile } from "@/lib/db/auth";
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getSessionProfile();
  return (
    <div className="dark flex min-h-[100dvh] flex-col bg-bg text-text">
      <TopNav profile={profile} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
