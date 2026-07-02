import { redirect } from "next/navigation";
import { getSessionProfile } from "@/lib/db/auth";

export default async function BecomeAnalystPage() {
  const profile = await getSessionProfile();
  if (!profile) redirect("/sign-in");
  if (profile.role === "analyst" || profile.role === "admin") redirect("/studio/compose");
  redirect("/onboarding/analyst");
}
