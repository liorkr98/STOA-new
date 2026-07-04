import { redirect } from "next/navigation";

/** Legacy route — branding lives in Studio now. */
export default function LegacyBrandingRedirect() {
  redirect("/studio/branding");
}
