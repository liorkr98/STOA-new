"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Plus } from "@phosphor-icons/react";
import { toggleFollow } from "@/app/actions/social";
import { Button, type ButtonSize } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";

export function FollowButton({
  analystId,
  initialFollowing,
  isAuthed,
  quiet = false,
  outline = false,
  size = "lg",
  className,
}: {
  analystId: string;
  initialFollowing: boolean;
  isAuthed: boolean;
  /** Outlined instead of coral, for screens where Subscribe is the coral action. */
  quiet?: boolean;
  /**
   * The coral outline rather than the fill, for a view where another coral
   * fill (Subscribe) may share the screen: at most one coral fill per view.
   */
  outline?: boolean;
  size?: ButtonSize;
  className?: string;
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
      variant={following || quiet || outline ? "ghost" : "coral"}
      onClick={onClick}
      disabled={pending}
      size={size}
      aria-pressed={following}
      className={cn(
        size === "lg" && "min-w-[9.5rem]",
        outline && !following && !quiet && "text-coral shadow-[inset_0_0_0_1.5px_var(--coral)] hover:shadow-[inset_0_0_0_1.5px_var(--coral)]",
        className,
      )}
    >
      {following ? <Check size={size === "lg" ? 16 : 14} weight="bold" /> : <Plus size={size === "lg" ? 16 : 14} weight="bold" />}
      {following ? "Following" : "Follow"}
    </Button>
  );
}
