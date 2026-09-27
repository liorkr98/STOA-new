"use client";

import { useRef, useState, useTransition } from "react";
import { Image as ImageIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { updateCoverUrl } from "@/app/actions/profile";
import { buttonClass } from "@/components/ui/button";
import { ImageCropDialog, readFileAsDataUrl } from "@/components/profile/image-crop-dialog";

/**
 * The picture a link to the storefront carries when it is shared (the page's
 * Open Graph image; the face stands in when there is none). The storefront
 * itself draws no banner.
 */
export function CoverUpload({
  userId,
  currentUrl,
  onUploaded,
}: {
  userId: string;
  currentUrl: string | null;
  onUploaded?: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(currentUrl);
  const [pending, start] = useTransition();
  const [cropSrc, setCropSrc] = useState<string | null>(null);

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
      await updateCoverUrl(next);
      setCropSrc(null);
    });
  }

  return (
    <>
      <div className="relative aspect-[1.91/1] max-w-[420px] overflow-hidden rounded-panel bg-surface-2">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className={`${buttonClass("ghost", "sm")} absolute bottom-3 right-3 shadow-[var(--shadow-card)]`}
        >
          <ImageIcon size={16} />
          {pending ? "Uploading..." : url ? "Change image" : "Add an image"}
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
        aspect={1.91}
        title="Crop your share image"
        onCancel={() => setCropSrc(null)}
        onComplete={(blob) => void uploadBlob(blob)}
      />
    </>
  );
}
