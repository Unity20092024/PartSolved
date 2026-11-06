"use client";
import { Camera, RefreshCw, Trash2, Upload } from "lucide-react";
import { PhotoPreview } from "./photo-preview";
import { usePhotoSelection } from "./use-photo-selection";
import { PhotoInputs, PhotoMessages } from "./photo-inputs";
export function IntakePhoto() {
  const selection = usePhotoSelection();
  return (
    <section
      className="intake-photo intake-card"
      aria-label="Your photo"
      aria-busy={selection.busy}
    >
      <PhotoInputs
        cameraRef={selection.camera}
        uploadRef={selection.upload}
        onSelect={selection.selectPhoto}
        onCancel={selection.cancel}
      />
      {selection.photo ? (
        <PhotoPreview photo={selection.photo} />
      ) : (
        <div className="empty-photo">
          <Camera size={44} aria-hidden="true" />
          <p>Add a clear photo of your part</p>
        </div>
      )}
      <div className="intake-photo-controls">
        <h2>Your Photo</h2>
        <button
          type="button"
          className="button button-secondary"
          disabled={selection.busy}
          onClick={() => selection.upload.current?.click()}
        >
          <RefreshCw size={18} aria-hidden="true" />
          {selection.photo ? "Replace Photo" : "Upload a Photo"}
        </button>
        <button
          type="button"
          className="button button-secondary"
          disabled={selection.busy}
          onClick={() => selection.camera.current?.click()}
        >
          <Camera size={18} aria-hidden="true" />
          {selection.photo ? "Retake Photo" : "Take a Photo"}
        </button>
        {selection.photo && (
          <button
            type="button"
            className="text-button"
            onClick={selection.removePhoto}
          >
            <Trash2 size={18} aria-hidden="true" />
            Remove Photo
          </button>
        )}
        <p className="field-hint">
          <Upload size={14} aria-hidden="true" /> JPEG, PNG, WebP · 10 MiB
          maximum. If your camera isn’t available, use upload. Your browser may
          show a file picker.
        </p>
        <PhotoMessages selection={selection} />
      </div>
    </section>
  );
}
