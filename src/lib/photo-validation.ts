export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function validatePhotoFile(file: File): string | null {
  if (!file.type.startsWith("image/"))
    return "Please choose an image file, such as a JPEG, PNG, or WebP photo.";
  if (file.type === "image/svg+xml")
    return "Please choose a photo rather than an SVG. JPEG, PNG, or WebP works well.";
  if (file.size === 0)
    return "This file is empty. Please choose another photo.";
  if (file.size > MAX_PHOTO_BYTES)
    return "This photo is too large. Please choose an image of 10 MB or less.";
  return null;
}

export async function validatePhotoDecoding(file: File): Promise<void> {
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      image.onload = () =>
        image.naturalWidth > 0 && image.naturalHeight > 0
          ? resolve()
          : reject(new Error("Invalid image"));
      image.onerror = () => reject(new Error("Unsupported or damaged image"));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
