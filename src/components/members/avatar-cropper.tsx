"use client";

import * as React from "react";
import { startTransition, useActionState } from "react";
import Cropper, { type Area } from "react-easy-crop";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { updateAvatar, type ProfileFormState } from "@/lib/profile/actions";

const INITIAL: ProfileFormState = { ok: false };

const OUTPUT_SIZE = 512;

/**
 * Draws the chosen crop region onto a square canvas and returns it as a JPEG
 * blob. `src` is a local data URL (from the picked file), so the canvas is not
 * tainted and toBlob works.
 */
function getCroppedBlob(src: string, area: Area): Promise<Blob | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(
        image,
        area.x,
        area.y,
        area.width,
        area.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE,
      );
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.9);
    };
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

/**
 * Avatar crop dialog. Opens when `src` (a data URL of the picked image) is set.
 * The inner editor is keyed by `src` so each new image mounts fresh — no reset
 * effect needed.
 */
export function AvatarCropDialog({
  userId,
  src,
  onClose,
}: {
  userId: string;
  src: string | null;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={src !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust photo</DialogTitle>
          <DialogDescription>
            Drag to reposition and use the slider to zoom. Only the circle is
            saved.
          </DialogDescription>
        </DialogHeader>

        {src !== null ? (
          <CropEditor key={src} userId={userId} src={src} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CropEditor({
  userId,
  src,
  onClose,
}: {
  userId: string;
  src: string;
  onClose: () => void;
}) {
  const [crop, setCrop] = React.useState({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [areaPixels, setAreaPixels] = React.useState<Area | null>(null);
  const [preparing, setPreparing] = React.useState(false);

  const [state, action, pending] = useActionState(updateAvatar, INITIAL);

  React.useEffect(() => {
    if (state.ok) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok]);

  async function handleSave() {
    if (!areaPixels) return;
    setPreparing(true);
    const blob = await getCroppedBlob(src, areaPixels);
    setPreparing(false);
    if (!blob) return;
    const formData = new FormData();
    formData.set("userId", userId);
    formData.set("file", new File([blob], "avatar.jpg", { type: "image/jpeg" }));
    // The dispatch runs after an await, so it's outside React's automatic
    // transition — wrap it so the action runs as a transition (and `pending`
    // tracks correctly).
    startTransition(() => {
      action(formData);
    });
  }

  const busy = preparing || pending;

  return (
    <>
      <div className="relative h-72 w-full overflow-hidden rounded-md bg-black">
        <Cropper
          image={src}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_area, areaInPixels) => setAreaPixels(areaInPixels)}
        />
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-[var(--color-muted-foreground)]">
          Zoom
        </span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.currentTarget.value))}
          aria-label="Zoom"
          className="flex-1 accent-[var(--color-primary)]"
        />
      </div>

      {state.message && !state.ok ? (
        <p className="text-xs text-[var(--color-muted-foreground)]">
          {state.message}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={busy || !areaPixels}>
          {busy ? "Uploading..." : "Save photo"}
        </Button>
      </DialogFooter>
    </>
  );
}
