"use client";

import Link from "next/link";
import { Camera, ArrowLeft } from "lucide-react";
import { usePhoto } from "./photo-provider";
import { PhotoPreview } from "./photo-preview";
export function PhotoDetails() {
  const { photo, setPhoto } = usePhoto();
  if (!photo)
    return (
      <div className="recovery-state">
        <Camera size={44} aria-hidden="true" />
        <h2>Your photo is no longer available</h2>
        <p>
          Photos are kept temporarily in this tab. Refreshing the page or
          opening a new tab clears the selection. Please select your photo
          again.
        </p>
        <Link href="/#photo-upload" className="button button-primary">
          Select a photo
        </Link>
      </div>
    );
  return (
    <div className="details-grid">
      <PhotoPreview photo={photo} />
      <div>
        <span className="eyebrow">Photo selected</span>
        <h2>Ready for the next step</h2>
        <p>
          Your image is available locally in this tab. Photo matching and the
          full details form are not available yet.
        </p>
        <p>Nothing has been uploaded or sent for identification.</p>
        <div className="scaffold-actions">
          <Link className="button button-secondary" href="/#photo-upload">
            <ArrowLeft size={18} aria-hidden="true" />
            Replace photo
          </Link>
          <button className="text-button" onClick={() => setPhoto(null)}>
            Remove image
          </button>
        </div>
      </div>
    </div>
  );
}
