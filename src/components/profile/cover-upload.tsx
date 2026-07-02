"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { updateCoverUrl } from "@/app/actions/profile";
import { buttonClass } from "@/components/ui/button";

export function CoverUpload({
  userId,
  currentUrl,
  bannerStyle,
}: {
  userId: string;
  currentUrl: string | null;
  bannerStyle?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [pending, start] = useTransition();

  const gradient =
    bannerStyle === "gradient-cool"
      ? "from-[#1a2a4a] via-accent/20 to-transparent"
      : bannerStyle === "minimal"
        ? "from-surface-2 to-bg"
        : "from-accent/30 via-accent/10 to-transparent";

  function onFile(file: File) {
    start(async () => {
      const supabase = createClient();
      const path = `${userId}/cover.jpg`;
      const { error } = await supabase.storage.from("covers").upload(path, file, {
        upsert: true,
        contentType: file.type,
      });
      if (error) return;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      const next = `${data.publicUrl}?t=${Date.now()}`;
      setUrl(next);
      await updateCoverUrl(next);
    });
  }

  return (
    <div className="relative h-40 overflow-hidden rounded-[var(--radius-card)] border border-border">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className={`h-full w-full bg-gradient-to-r ${gradient}`} />
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
        className={`${buttonClass("secondary", "sm")} absolute bottom-3 right-3 shadow-[var(--shadow-card)]`}
      >
        <ImageIcon size={16} />
        {pending ? "Uploading..." : "Cover image"}
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
