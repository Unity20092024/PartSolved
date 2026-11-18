import { randomUUID } from "node:crypto";
import {
  catalogAdmin,
  assertCatalogOrigin,
  requireCatalogConnection,
  catalogDatabaseError,
} from "@/lib/catalog/server";
import { CatalogError, text, uuid, enumValue } from "@/lib/catalog/model";
import { catalogResponse, catalogFailure } from "@/lib/catalog/http";
import { limitedBody } from "@/lib/blog/http";
import { normalizeArticleImage } from "@/lib/blog/images";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertCatalogOrigin(request);
    const { client } = await catalogAdmin();
    requireCatalogConnection(true);
    const header = request.headers.get("x-catalog-media") || "";
    if (header.length > 8000)
      throw new CatalogError("Shorten the image metadata.");
    const meta = JSON.parse(decodeURIComponent(header));
    if (!uuid(meta.product_id) || meta.rights_confirmed !== true)
      throw new CatalogError(
        "Choose a saved product and confirm your authorization to upload this image.",
      );
    const kind = enumValue(meta.kind, ["photo", "drawing"] as const),
      alt = text(meta.alt, 300, true),
      rights_reference = text(meta.rights_reference, 1000, true),
      attribution = text(meta.attribution || "", 1000);
    const input = await limitedBody(request, 2097152);
    const { data: bytes, info } = await normalizeArticleImage(input);
    const id = randomUUID(),
      path = `${id}.webp`;
    const { error: insert } = await client
      .from("catalog_media")
      .insert({
        id,
        product_id: meta.product_id,
        variant_id: null,
        kind,
        alt,
        rights_reference,
        attribution,
        path,
        width: info.width,
        height: info.height,
        bytes: bytes.length,
      });
    catalogDatabaseError(insert);
    const { error: upload } = await client.storage
      .from("catalog-media")
      .upload(path, bytes, { contentType: "image/webp", upsert: false });
    if (upload) {
      await client
        .from("catalog_media")
        .update({ state: "failed" })
        .eq("id", id);
      throw new CatalogError(
        "Upload failed. The failed image record is retained for deliberate cleanup; the product is unchanged.",
        503,
      );
    }
    const { data, error } = await client
      .from("catalog_media")
      .update({ state: "ready" })
      .eq("id", id)
      .select("*")
      .single();
    catalogDatabaseError(error);
    return catalogResponse(data, 201);
  } catch (error) {
    return catalogFailure(error);
  }
}
