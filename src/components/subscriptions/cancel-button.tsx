"use client";

import { useTransition } from "react";
import { cancelSubscription } from "@/app/actions/subscriptions";
import { buttonClass } from "@/components/ui/button";

export function CancelSubscriptionButton({ analystId }: { analystId: string }) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      className={buttonClass("secondary", "sm")}
      onClick={() => {
        if (!confirm("Cancel this subscription? You keep access until the current period ends.")) return;
        start(async () => {
          await cancelSubscription(analystId);
        });
      }}
    >
      {pending ? "Cancelling..." : "Cancel"}
    </button>
  );
}
