"use client";
import { useEffect, type ChangeEventHandler, type RefObject } from "react";
import type { PhotoSelection } from "./use-photo-selection";
export function PhotoInputs({
  cameraRef,
  uploadRef,
  onSelect,
  onCancel,
}: {
  cameraRef: RefObject<HTMLInputElement | null>;
  uploadRef: RefObject<HTMLInputElement | null>;
  onSelect: ChangeEventHandler<HTMLInputElement>;
  onCancel: () => void;
}) {
  useEffect(() => {
    const inputs = [cameraRef.current, uploadRef.current];
    inputs.forEach((input) => input?.addEventListener("cancel", onCancel));
    return () =>
      inputs.forEach((input) => input?.removeEventListener("cancel", onCancel));
  }, [cameraRef, uploadRef, onCancel]);
  return (
    <>
      <input
        ref={cameraRef}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        capture="environment"
        aria-label="Take a photo of your part"
        onChange={onSelect}
      />
      <input
        ref={uploadRef}
        className="sr-only"
        tabIndex={-1}
        type="file"
        accept="image/*"
        aria-label="Upload a photo of your part"
        onChange={onSelect}
      />
    </>
  );
}
export function PhotoMessages({ selection }: { selection: PhotoSelection }) {
  return (
    <>
      {selection.busy && (
        <p className="photo-status" role="status">
          Checking your photo…
        </p>
      )}
      {selection.error && (
        <p id="photo-error" className="photo-error" role="alert">
          {selection.error}
        </p>
      )}
      <p className="photo-status" role="status">
        {selection.status}
      </p>
    </>
  );
}
