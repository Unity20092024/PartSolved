"use client";
import { useEffect, useRef, useState } from "react";
import { usePhoto } from "../photo-provider";
import { PhotoPreview } from "../photo-preview";
import {
  validatePhotoDecoding,
  validatePhotoFile,
} from "@/lib/photo-validation";
import type { SupportingPhoto } from "@/types/assistance";

function MarkablePhoto({ photo }: { photo: SupportingPhoto }) {
  const { setAssistance } = usePhoto();
  const [source, setSource] = useState("");
  useEffect(() => {
    const url = URL.createObjectURL(photo.file);
    // Blob URLs must be allocated and revoked on the client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [photo.file]);
  const update = (values: Partial<SupportingPhoto>) =>
    setAssistance((previous) => ({
      ...previous,
      photos: previous.photos.map((item) =>
        item.id === photo.id ? { ...item, ...values } : item,
      ),
    }));
  return (
    <article className="assist-photo intake-card">
      <div
        className="assist-markable"
        role="button"
        tabIndex={0}
        aria-label={`Mark problem area in ${photo.file.name}. Press Enter to mark the center, then arrow keys to move the mark.`}
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          update({
            point: {
              x: (event.clientX - bounds.left) / bounds.width,
              y: (event.clientY - bounds.top) / bounds.height,
            },
          });
        }}
        onKeyDown={(event) => {
          if (
            ![
              "Enter",
              " ",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          const point = photo.point || { x: 0.5, y: 0.5 };
          update({
            point: {
              x: Math.max(
                0,
                Math.min(
                  1,
                  point.x +
                    (event.key === "ArrowLeft"
                      ? -0.05
                      : event.key === "ArrowRight"
                        ? 0.05
                        : 0),
                ),
              ),
              y: Math.max(
                0,
                Math.min(
                  1,
                  point.y +
                    (event.key === "ArrowUp"
                      ? -0.05
                      : event.key === "ArrowDown"
                        ? 0.05
                        : 0),
                ),
              ),
            },
          });
        }}
      >
        {/* Local blob previews cannot use the server-side Next image optimizer. */}
        {source && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source} alt={`Supporting photo: ${photo.purpose}`} />
        )}
        {photo.point && (
          <span
            className="assist-photo-mark"
            style={{
              left: `${photo.point.x * 100}%`,
              top: `${photo.point.y * 100}%`,
            }}
            aria-hidden="true"
          >
            +
          </span>
        )}
      </div>
      <h3>{photo.file.name}</h3>
      <label>
        Photo shows
        <select
          value={photo.purpose}
          onChange={(event) => update({ purpose: event.target.value })}
        >
          {[
            "Entire window or door",
            "Problem area",
            "Loose or broken component",
            "Label or part number",
          ].map((purpose) => (
            <option key={purpose}>{purpose}</option>
          ))}
        </select>
      </label>
      <label>
        Describe the marked area (optional)
        <textarea
          maxLength={500}
          rows={2}
          value={photo.note}
          onChange={(event) => update({ note: event.target.value })}
        />
      </label>
      <p className="field-hint">
        Tap the photo to mark an area, or focus it and use Enter and the arrow
        keys. A written note works too.
      </p>
      <p role="status">
        {photo.point
          ? `Mark: ${Math.round(photo.point.x * 100)}% across, ${Math.round(photo.point.y * 100)}% down.`
          : "No area marked."}
      </p>
      <div className="assist-inline-actions">
        <button
          type="button"
          className="text-button"
          onClick={() => update({ point: undefined })}
        >
          Clear mark
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setAssistance((previous) => ({
              ...previous,
              photos: previous.photos.filter((item) => item.id !== photo.id),
            }))
          }
        >
          Remove {photo.file.name}
        </button>
      </div>
    </article>
  );
}
export function AssistancePhotos() {
  const { assistance, setAssistance, photo } = usePhoto();
  const camera = useRef<HTMLInputElement>(null),
    upload = useRef<HTMLInputElement>(null);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    const cancel = () =>
      setStatus("No new photo selected. Your existing photos are unchanged.");
    const inputs = [camera.current, upload.current];
    inputs.forEach((input) => input?.addEventListener("cancel", cancel));
    return () => {
      mounted.current = false;
      inputs.forEach((input) => input?.removeEventListener("cancel", cancel));
    };
  }, []);
  async function select(files: FileList | null) {
    if (!files?.length) {
      setStatus("No new photo selected.");
      return;
    }
    setError("");
    setBusy(true);
    const selected = Array.from(files);
    try {
      if (selected.length + assistance.photos.length > 4)
        throw new Error(
          "You can keep up to four supporting photos. Remove one before adding more.",
        );
      for (const file of selected) {
        const message = validatePhotoFile(file);
        if (message) throw new Error(message);
        try {
          await validatePhotoDecoding(file);
        } catch {
          throw new Error(
            "This photo could not be opened. Choose an undamaged JPEG, PNG or WebP.",
          );
        }
      }
      if (mounted.current) {
        setAssistance((previous) => ({
          ...previous,
          photos: [
            ...previous.photos,
            ...selected.map((file) => ({
              id: crypto.randomUUID(),
              file,
              purpose: "Entire window or door",
              note: "",
            })),
          ].slice(0, 4),
        }));
        setStatus(
          `${selected.length} supporting photo${selected.length === 1 ? "" : "s"} added. Adding photos does not analyze them.`,
        );
      }
    } catch (failure) {
      if (mounted.current)
        setError(
          failure instanceof Error
            ? failure.message
            : "Unable to open that photo.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <>
      <p>
        Don&apos;t know which part is broken? Take a picture of the entire
        window or door first.
      </p>
      <p className="field-hint">
        You can add a close-up, a loose component, and a label or part number
        too. Up to four supporting photos, JPEG, PNG or WebP, 10 MiB each.
        Photos are supporting information; they are not automatically
        identified.
      </p>
      <div className="workflow-actions">
        <button
          type="button"
          className="button button-primary"
          disabled={busy || assistance.photos.length >= 4}
          onClick={() => camera.current?.click()}
        >
          Take a Supporting Photo
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={busy || assistance.photos.length >= 4}
          onClick={() => upload.current?.click()}
        >
          Upload Supporting Photos
        </button>
      </div>
      <input
        ref={camera}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Supporting camera photo"
        disabled={busy}
        onChange={(event) => {
          void select(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={upload}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        multiple
        aria-label="Supporting photo files"
        disabled={busy}
        onChange={(event) => {
          void select(event.target.files);
          event.target.value = "";
        }}
      />
      <p className="field-hint">
        Camera capture depends on your browser. If it is unavailable or
        permission is denied, choose Upload Supporting Photos. You can continue
        without a photo.
      </p>
      {busy && <p role="status">Checking photos…</p>}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {photo && (
        <details>
          <summary>Your existing part photo is also retained</summary>
          <PhotoPreview photo={photo} />
        </details>
      )}
      <div className="assist-photo-grid">
        {assistance.photos.map((item) => (
          <MarkablePhoto key={item.id} photo={item} />
        ))}
      </div>
    </>
  );
}
