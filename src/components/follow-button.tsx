"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus } from "@phosphor-icons/react";
import { toggleFollow } from "@/app/actions/social";
import { Button } from "@/components/ui/button";

export function FollowButton({
  analystId,
  initialFollowing,
  isAuthed,
}: {
  analystId: string;
  initialFollowing: boolean;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!isAuthed) {
      router.push("/sign-in");
      return;
    }
    setFollowing((v) => !v); // optimistic
    startTransition(async () => {
      const res = await toggleFollow(analystId);
      setFollowing(res.following);
    });
  }

  return (
    <Button
      variant={following ? "secondary" : "primary"}
      onClick={onClick}
      disabled={pending}
      size="lg"
    >
      {following ? <Check size={16} weight="bold" /> : <Plus size={16} weight="bold" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
