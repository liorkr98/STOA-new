import { redirect } from "next/navigation";
import { DispatchView } from "@/components/dispatch/dispatch-view";
import { getSessionUserId } from "@/lib/db/auth";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";

export default async function PublicDispatchPage() {
  const userId = await getSessionUserId();
  if (userId) redirect("/home");

  const dispatch = await buildDispatch(false);
  return <DispatchView dispatch={dispatch} mode="public" />;
}
