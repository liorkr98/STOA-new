import { DispatchView } from "@/components/dispatch/dispatch-view";
import { getSessionUserId } from "@/lib/db/auth";
import { buildDispatch } from "@/lib/dispatch/build-dispatch";

export default async function DispatchHomePage() {
  const userId = await getSessionUserId();
  const dispatch = await buildDispatch(Boolean(userId));

  return <DispatchView dispatch={dispatch} />;
}
