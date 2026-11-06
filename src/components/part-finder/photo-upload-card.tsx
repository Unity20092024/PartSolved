"use client";

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
import { usePhotoSelection } from "./use-photo-selection";
import { PhotoInputs, PhotoMessages } from "./photo-inputs";

export function PhotoUploadCard() {
  const selection = usePhotoSelection();
  const { photo, camera, upload, busy } = selection;
  const { setDraft } = usePhoto();
  return (
    <section
      id="photo-upload"
      className={`photo-upload-card ${photo ? "has-photo" : ""}`}
      aria-labelledby="upload-heading"
      aria-busy={busy}
    >
      <PhotoInputs
        cameraRef={selection.camera}
        uploadRef={selection.upload}
        onSelect={selection.selectPhoto}
        onCancel={selection.cancel}
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
            <button className="text-button" onClick={selection.removePhoto}>
              <Trash2 size={16} aria-hidden="true" />
              Remove image
            </button>
          </div>
          <Link
            className="button button-primary continue-button"
            href="/find-part/preview"
            aria-disabled={busy}
            onClick={(event) => {
              if (busy) event.preventDefault();
              else setDraft((previous) => ({ ...previous, source: "photo" }));
            }}
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
      <PhotoMessages selection={selection} />
      {!photo && (
        <p className="upload-help">
          JPEG, PNG, WebP · up to 10 MiB · browser only
        </p>
      )}
    </section>
  );
}
