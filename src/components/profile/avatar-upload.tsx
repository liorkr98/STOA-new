"use client";

import { useRef, useState, useTransition } from "react";
import { Camera } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/app/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/design/cn";

export function AvatarUpload({
  userId,
  displayName,
  currentUrl,
}: {
  userId: string;
  displayName: string;
  currentUrl: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(currentUrl);
  const [pending, start] = useTransition();

  function onFile(file: File) {
    start(async () => {
      const supabase = createClient();
      const path = `${userId}/avatar.jpg`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) return;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${data.publicUrl}?t=${Date.now()}`;
      setPreview(url);
      await updateAvatarUrl(url);
    });
  }

  return (
    <div className="relative inline-block">
      <Avatar src={preview} name={displayName} size="xl" className="ring-4 ring-surface" />
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full",
          "border border-border bg-surface text-accent shadow-sm hover:bg-accent-weak",
        )}
        aria-label="Upload avatar"
      >
        <Camera size={18} weight="fill" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
