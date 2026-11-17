"use client";
import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { mediaUrl, type BlogMedia } from "@/lib/blog/content";
import { compressArticleImage } from "./client-api";
export type ArticleImage = {
  mediaId: string;
  src: string;
  alt: string;
  caption: string;
};
export function EditorImageDialog({
  media,
  initial,
  editing,
  onClose,
  onApply,
  onUploaded,
}: {
  media: BlogMedia[];
  initial?: ArticleImage;
  editing: boolean;
  onClose: () => void;
  onApply: (image: ArticleImage) => void;
  onUploaded: (image: BlogMedia) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    file = useRef<HTMLInputElement>(null);
  const [id, setId] = useState(initial?.mediaId || ""),
    [alt, setAlt] = useState(initial?.alt || ""),
    [caption, setCaption] = useState(initial?.caption || "");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  async function apply(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!alt.trim())
        throw new Error("Describe the image for readers who cannot see it.");
      let imageId = id;
      const selected = file.current?.files?.[0];
      if (selected) {
        const bytes = await compressArticleImage(selected);
        const response = await fetch("/api/blog/media", {
          method: "POST",
          headers: {
            "Content-Type": bytes.type,
            "x-image-alt": encodeURIComponent(alt.trim()),
          },
          body: bytes,
          signal: AbortSignal.timeout(30000),
        });
        const image = await response.json();
        if (!response.ok)
          throw new Error(
            image.error ||
              "Image upload failed. Your article text is unchanged.",
          );
        onUploaded(image);
        imageId = image.id;
      }
      if (!imageId)
        throw new Error("Choose a photo from your phone or an uploaded image.");
      onApply({
        mediaId: imageId,
        src: mediaUrl(imageId),
        alt: alt.trim(),
        caption: caption.trim(),
      });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Image insertion failed. Your article text is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor-dialog"
      aria-labelledby="image-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form onSubmit={apply}>
        <div className="editor-dialog-heading">
          <h2 id="image-dialog-title">
            {editing ? "Edit or replace image" : "Insert image at cursor"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close image dialog"
          >
            ×
          </button>
        </div>
        <p>
          Your cursor position is kept while you choose a photo. Uploads use the
          existing private image library.
        </p>
        {error && (
          <p role="alert" className="blog-notice">
            {error}
          </p>
        )}
        <fieldset disabled={busy}>
          <label>
            Choose photo from device
            <input
              ref={file}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={() => setError("")}
            />
          </label>
          <p className="blog-muted">
            JPEG, PNG or WebP, up to 10 MiB. Choose Photos or Files on Android.
          </p>
          <label>
            Or choose an uploaded image
            <select
              value={id}
              onChange={(event) => {
                const item = media.find((m) => m.id === event.target.value);
                setId(event.target.value);
                if (item) setAlt(item.alt);
                if (file.current) file.current.value = "";
              }}
            >
              <option value="">Choose image</option>
              {id && !media.some((item) => item.id === id) && (
                <option value={id}>Current article image</option>
              )}
              {media
                .filter((item) => item.state === "ready")
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.alt}
                  </option>
                ))}
            </select>
          </label>
          {id && (
            <Image
              className="editor-dialog-photo"
              src={mediaUrl(id)}
              width={800}
              height={500}
              unoptimized
              alt={alt || "Selected image preview"}
            />
          )}
          <label>
            Image alt text
            <input
              value={alt}
              onChange={(event) => setAlt(event.target.value)}
              required
              maxLength={300}
            />
          </label>
          <label>
            Image caption (optional)
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={1000}
            />
          </label>
          <div className="editor-dialog-actions">
            <button type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="editor-primary" type="submit">
              {busy
                ? "Preparing image…"
                : editing
                  ? "Update image"
                  : "Insert image"}
            </button>
          </div>
        </fieldset>
      </form>
    </dialog>
  );
}
