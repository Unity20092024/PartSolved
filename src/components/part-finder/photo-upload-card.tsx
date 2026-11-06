"use client";

import { useRef, useState, useEffect, type ChangeEvent } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Camera,
  ScanLine,
  Upload,
  Trash2,
  RefreshCw,
} from "lucide-react";
import { usePhoto } from "./photo-provider";
import { PhotoPreview } from "./photo-preview";
import {
  validatePhotoDecoding,
  validatePhotoFile,
} from "@/lib/photo-validation";

export function PhotoUploadCard() {
  const { photo, setPhoto } = usePhoto();
  const camera = useRef<HTMLInputElement>(null);
  const upload = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(
    () => () => {
      generation.current += 1;
    },
    [],
  );
  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const current = ++generation.current;
    const issue = validatePhotoFile(file);
    setError("");
    if (issue) {
      setError(issue);
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      await validatePhotoDecoding(file);
      if (current === generation.current) setPhoto(file);
    } catch {
      if (current === generation.current)
        setError(
          "We couldn’t open this image. It may be damaged or unsupported by your browser. Try a JPEG, PNG, or WebP photo.",
        );
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  return (
    <section
      id="photo-upload"
      className={`photo-upload-card ${photo ? "has-photo" : ""}`}
      aria-labelledby="upload-heading"
      aria-busy={busy}
    >
      <input
        ref={camera}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a photo of your part"
        onChange={selectPhoto}
      />
      <input
        ref={upload}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        aria-label="Upload a photo of your part"
        onChange={selectPhoto}
      />
      {photo ? (
        <>
          <h2 id="upload-heading">Your Part Photo</h2>
          <PhotoPreview photo={photo} />
          <div className="preview-actions">
            <button
              className="text-button"
              onClick={() => upload.current?.click()}
              disabled={busy}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Replace image
            </button>
            <button
              className="text-button"
              onClick={() => {
                generation.current += 1;
                setPhoto(null);
                setError("");
                setBusy(false);
              }}
            >
              <Trash2 size={16} aria-hidden="true" />
              Remove image
            </button>
          </div>
          <Link
            className="button button-primary continue-button"
            href="/find-part/details"
          >
            Continue
            <ArrowRight size={20} aria-hidden="true" />
          </Link>
          <p className="photo-privacy">
            Kept in this tab only. Nothing is uploaded.
          </p>
        </>
      ) : (
        <>
          <div className="scan-camera" aria-hidden="true">
            <ScanLine />
            <Camera />
          </div>
          <h2 id="upload-heading">
            Take a Photo
            <br />
            of Your Part
          </h2>
          <button
            className="button button-primary snap-button"
            onClick={() => camera.current?.click()}
            disabled={busy}
          >
            <Camera
              size={28}
              fill="currentColor"
              className="camera-button-icon"
              aria-hidden="true"
            />
            Snap a Photo Now
          </button>
          <button
            className="button button-secondary upload-button"
            onClick={() => upload.current?.click()}
            disabled={busy}
          >
            <Upload size={21} aria-hidden="true" />
            Upload a Photo
          </button>
        </>
      )}
      {busy && (
        <p className="photo-status" role="status">
          Checking your photo…
        </p>
      )}
      {error && (
        <p id="photo-error" className="photo-error" role="alert">
          {error}
        </p>
      )}
      {!photo && (
        <p className="upload-help">
          Images up to 10 MB · stays in your browser
        </p>
      )}
    </section>
  );
}
