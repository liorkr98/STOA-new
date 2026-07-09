import { redirect } from "next/navigation";

/** Legacy URL — Track Score analytics lives at `/score`. */
export default async function MoatRedirectPage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  redirect(`/analyst/${handle}/score`);
}
