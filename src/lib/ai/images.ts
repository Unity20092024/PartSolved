import "server-only";
import sharp from "sharp";
import {
  MAX_BODY_BYTES,
  MAX_EDGE,
  MAX_IMAGE_BYTES,
  MAX_IMAGES,
} from "./policy";

export async function readLimitedBody(
  request: Request,
  limit = MAX_BODY_BYTES,
) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new Error("Request too large");
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Empty request");
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > limit) {
        await reader.cancel();
        throw new Error("Request too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks);
}
export async function normalizeImage(file: File): Promise<Buffer> {
  if (
    !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
    file.size < 1 ||
    file.size > MAX_IMAGE_BYTES
  )
    throw new Error("Invalid analysis photo");
  const bytes = Buffer.from(await file.arrayBuffer());
  // Reject other decoder formats BEFORE handing untrusted bytes to libvips.
  const signatureMatches =
    file.type === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : file.type === "image/png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.toString("ascii", 0, 4) === "RIFF" &&
          bytes.toString("ascii", 8, 12) === "WEBP";
  if (!signatureMatches) throw new Error("Invalid analysis photo");
  const source = sharp(bytes, {
    failOn: "warning",
    limitInputPixels: MAX_EDGE * MAX_EDGE,
    animated: false,
  });
  const metadata = await source.metadata();
  const format = {
    "image/jpeg": "jpeg",
    "image/png": "png",
    "image/webp": "webp",
  }[file.type];
  if (
    metadata.format !== format ||
    (metadata.pages ?? 1) !== 1 ||
    !metadata.width ||
    !metadata.height ||
    metadata.width > MAX_EDGE ||
    metadata.height > MAX_EDGE
  )
    throw new Error("Invalid analysis photo");
  // No withMetadata(): strip EXIF/GPS, apply original orientation, flatten transparency.
  const result = await source
    .rotate()
    .flatten({ background: "white" })
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toBuffer();
  if (result.length > MAX_IMAGE_BYTES)
    throw new Error("Photo could not be compressed safely");
  return result;
}
export async function analysisImages(request: Request) {
  const type = request.headers.get("content-type") ?? "";
  if (!type.startsWith("multipart/form-data;"))
    throw new Error("Expected photo upload");
  const body = await readLimitedBody(request);
  const form = await new Response(new Uint8Array(body), {
    headers: { "content-type": type },
  }).formData();
  const entries = [...form.entries()];
  if (
    entries.length < 1 ||
    entries.length > MAX_IMAGES ||
    entries.some(([key, value]) => key !== "photos" || !(value instanceof File))
  )
    throw new Error("Choose one to three photos");
  // Process sequentially to bound decoder memory.
  const images: Buffer[] = [];
  for (const [, value] of entries)
    images.push(await normalizeImage(value as File));
  return images;
}
