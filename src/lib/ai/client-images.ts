import { validatePhotoFile } from "@/lib/photo-validation";
const MAX_EDGE = 1536;
const MAX_BYTES = 700 * 1024;
export async function compressAnalysisPhoto(file: File): Promise<Blob> {
  const error = validatePhotoFile(file);
  if (error) throw new Error(error);
  const image = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  try {
    if (
      !image.width ||
      !image.height ||
      image.width * image.height > 50_000_000
    )
      throw new Error("This photo has too many pixels. Choose a smaller copy.");
    const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Photo processing is unavailable. Continue without AI or try another browser.",
      );
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (blob && blob.size <= MAX_BYTES) return blob;
    }
    throw new Error(
      "This photo could not be compressed. Choose a smaller photo or continue without AI.",
    );
  } finally {
    image.close();
  }
}
