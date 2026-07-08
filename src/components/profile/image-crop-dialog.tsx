"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";

async function cropImage(imageSrc: string, crop: Area, mime = "image/jpeg"): Promise<Blob> {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.drawImage(image, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Crop failed"))), mime, 0.92);
  });
}

/** Modal cropper used by avatar (1:1) and cover (3:1) uploads in the branding studio. */
export function ImageCropDialog({
  open,
  imageSrc,
  aspect,
  title,
  onCancel,
  onComplete,
}: {
  open: boolean;
  imageSrc: string | null;
  aspect: number;
  title: string;
  onCancel: () => void;
  onComplete: (blob: Blob) => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [pending, setPending] = useState(false);

  const onCropComplete = useCallback((_: Area, cropped: Area) => setArea(cropped), []);

  if (!open || !imageSrc) return null;

  async function apply() {
    if (!area || !imageSrc) return;
    setPending(true);
    try {
      const blob = await cropImage(imageSrc, area);
      onComplete(blob);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--ink)]/60 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface shadow-[var(--shadow-card)]">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold">{title}</h3>
        </div>
        <div className="relative h-64 bg-[var(--ink)]">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3">
          <label className="flex items-center gap-3 text-sm text-text-mute">
            Zoom
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" size="sm" disabled={pending || !area} onClick={() => void apply()}>
              {pending ? "Saving..." : "Apply crop"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Read a File as a data URL for the cropper preview. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
