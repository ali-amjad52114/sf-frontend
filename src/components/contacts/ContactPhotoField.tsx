"use client";

import { useId, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { MAX_PHOTO_FILE_SIZE } from "@/lib/contacts/schema";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ACCEPTED_LABEL = "JPG, PNG, or WebP up to 500 KB";

/**
 * Converts a local image into the `photo_url` data URL expected by the API.
 * The hidden input means a selected photo participates in the normal form POST,
 * including an edit submission where an existing photo was never changed.
 */
export default function ContactPhotoField({
  defaultValue,
  error,
}: {
  defaultValue?: string | null;
  error?: string;
}) {
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const [photoUrl, setPhotoUrl] = useState(defaultValue ?? "");
  const [localError, setLocalError] = useState<string>();

  function selectPhoto(file?: File) {
    setLocalError(undefined);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setLocalError("Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_PHOTO_FILE_SIZE) {
      setLocalError("Choose an image that is 500 KB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") setPhotoUrl(reader.result);
    });
    reader.addEventListener("error", () => {
      setLocalError("The selected image could not be read. Please try another file.");
    });
    reader.readAsDataURL(file);
  }

  const message = localError ?? error;

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Contact photo</legend>
      <div className="border-b border-hairline pb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Photo
        </h2>
        <p className="text-[13px] text-muted-foreground">
          {ACCEPTED_LABEL}. Leave it unchanged to keep the current photo.
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-secondary text-muted-foreground">
          {photoUrl ? (
            // Selected images are data URLs, while existing photos may be hosted
            // anywhere, so next/image cannot safely optimize this preview.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="Selected contact photo" className="h-full w-full object-cover" />
          ) : (
            <ImagePlus className="h-6 w-6" aria-hidden="true" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor={inputId} className="cursor-pointer rounded-md border border-border bg-secondary px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70">
            {photoUrl ? "Replace photo" : "Upload photo"}
          </label>
          <input
            id={inputId}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => selectPhoto(event.currentTarget.files?.[0])}
            aria-describedby={message ? errorId : undefined}
          />
          {photoUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setPhotoUrl("");
                setLocalError(undefined);
              }}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove photo
            </Button>
          ) : null}
        </div>
      </div>

      <input type="hidden" name="photo_url" value={photoUrl} />
      {message ? (
        <p id={errorId} role="alert" className="text-[13px] text-destructive">
          {message}
        </p>
      ) : null}
    </fieldset>
  );
}
