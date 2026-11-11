export async function blogRequest<T>(url: string, value?: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/json" },
    body: value === undefined ? undefined : JSON.stringify(value),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.error || "The action failed.") as Error & {
      status: number;
    };
    error.status = response.status;
    throw error;
  }
  return data as T;
}
// Client compression keeps Android uploads below serverless request limits.
export async function compressArticleImage(file: File): Promise<Blob> {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPEG, PNG or WebP image.");
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Choose an image smaller than 10 MiB.");
  const image = await createImageBitmap(file);
  try {
    if (image.width * image.height > 40_000_000)
      throw new Error("This image has too many pixels. Resize it first.");
    const ratio = Math.min(1, 1600 / Math.max(image.width, image.height)),
      canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * ratio));
    canvas.height = Math.max(1, Math.round(image.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser could not prepare this image.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (value) =>
          value
            ? resolve(value)
            : reject(new Error("Image compression failed.")),
        "image/webp",
        0.84,
      ),
    );
    if (blob.size > 2 * 1024 * 1024)
      throw new Error(
        "This image is still too large. Resize it and try again.",
      );
    return blob;
  } finally {
    image.close();
  }
}
