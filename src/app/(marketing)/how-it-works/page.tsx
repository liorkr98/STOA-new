import { redirect } from "next/navigation";

/** Canonical methodology lives on /scoring. Keep this path for old links. */
export default function HowItWorksRedirect() {
  redirect("/scoring");
}
