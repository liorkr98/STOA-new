"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { updateCoverUrl } from "@/app/actions/profile";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/design/cn";
import { ImageCropDialog, readFileAsDataUrl } from "@/components/profile/image-crop-dialog";
import { themeFromConfig } from "@/lib/profile/themes";
import type { ProfileConfig } from "@/lib/editor/types";

export function CoverUpload({
  userId,
  currentUrl,
  bannerStyle,
  onUploaded,
  onUseCoverTheme,
}: {
  userId: string;
  currentUrl: string | null;
  bannerStyle?: string;
  onUploaded?: (url: string) => void;
  onUseCoverTheme?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [pending, start] = useTransition();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

  const config: ProfileConfig = { banner_style: bannerStyle as ProfileConfig["banner_style"] };
  const theme = themeFromConfig(config);

  async function uploadBlob(blob: Blob) {
    start(async () => {
      const supabase = createClient();
      const path = `${userId}/cover.jpg`;
      const { error } = await supabase.storage.from("covers").upload(path, blob, {
        upsert: true,
        contentType: "image/jpeg",
      });
      if (error) return;
      const { data } = supabase.storage.from("covers").getPublicUrl(path);
      const next = `${data.publicUrl}?t=${Date.now()}`;
      setUrl(next);
      onUploaded?.(next);
      onUseCoverTheme?.();
      await updateCoverUrl(next);
      setCropSrc(null);
    });
  }

  return (
    <>
      <div className="relative h-40 overflow-hidden rounded-[var(--radius-card)] border border-border">
        {url && theme.banner_style === "cover" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover opacity-80" />
        ) : (
          <div className={cn("h-full w-full", theme.className || "bg-gradient-to-r from-accent/30 via-accent/10 to-transparent")} />
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
            if (f) void readFileAsDataUrl(f).then(setCropSrc);
            e.target.value = "";
          }}
        />
      </div>

      <ImageCropDialog
        open={Boolean(cropSrc)}
        imageSrc={cropSrc}
        aspect={3}
        title="Crop cover banner"
        onCancel={() => setCropSrc(null)}
        onComplete={(blob) => void uploadBlob(blob)}
      />
    </>
  );
}
