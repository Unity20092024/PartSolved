import "server-only";
import sharp from "sharp";
import { BlogError } from "./server";
export async function normalizeArticleImage(input: Uint8Array) {
  if (input.byteLength > 2_097_152)
    throw new BlogError(
      "Compress this image below 2 MiB before uploading.",
      413,
    );
  const image = sharp(input, {
    limitInputPixels: 16_000_000,
    failOn: "warning",
    animated: false,
  });
  const metadata = await image.metadata();
  if (
    !["jpeg", "png", "webp"].includes(metadata.format || "") ||
    (metadata.pages || 1) > 1
  )
    throw new BlogError("Use a still JPEG, PNG or WebP image.");
  const result = await image
    .rotate()
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toBuffer({ resolveWithObject: true });
  if (result.data.length > 2_097_152)
    throw new BlogError("Compress this image further before uploading.", 413);
  return result;
}
