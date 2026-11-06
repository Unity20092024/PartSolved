"use client";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { usePhoto } from "./photo-provider";
import {
  validatePhotoDecoding,
  validatePhotoFile,
} from "@/lib/photo-validation";
export function usePhotoSelection() {
  const {
    photo,
    setPhoto,
    photoBusy: busy,
    setPhotoBusy: setBusy,
  } = usePhoto();
  const camera = useRef<HTMLInputElement>(null),
    upload = useRef<HTMLInputElement>(null),
    generation = useRef(0);
  const [error, setError] = useState(""),
    [status, setStatus] = useState("");
  useEffect(
    () => () => {
      generation.current += 1;
      setBusy(false);
    },
    [setBusy],
  );
  async function selectPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      setStatus(
        "No new photo selected. Your current photo and answers have been kept.",
      );
      return;
    }
    const current = ++generation.current;
    setError("");
    setStatus("");
    const issue = validatePhotoFile(file);
    if (issue) {
      setError(issue);
      setBusy(false);
      return;
    }
    setBusy(true);
    try {
      await validatePhotoDecoding(file);
      if (current === generation.current) {
        setPhoto(file);
        setStatus("Photo selected. It stays in this tab only.");
      }
    } catch {
      if (current === generation.current)
        setError(
          "We couldn’t open this image. It may be damaged or unsupported by your browser. Try a JPEG, PNG, or WebP photo.",
        );
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  function removePhoto() {
    generation.current += 1;
    setPhoto(null);
    setError("");
    setBusy(false);
    setStatus(
      "Photo removed. Your identification answers are kept until this tab is refreshed or closed.",
    );
  }
  function cancel() {
    setStatus(
      "Selection canceled. You can try the camera again or upload an existing photo. Your current photo and answers are unchanged.",
    );
  }
  return {
    photo,
    camera,
    upload,
    error,
    busy,
    status,
    selectPhoto,
    removePhoto,
    cancel,
  };
}
export type PhotoSelection = ReturnType<typeof usePhotoSelection>;
