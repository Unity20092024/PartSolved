import { publicBlogClient, serviceBlogClient } from "@/lib/blog/server";
import {
  catalogAdmin,
  assertCatalogOrigin,
  requireCatalogConnection,
  catalogDatabaseError,
  catalogEnabled,
} from "@/lib/catalog/server";
import { uuid, CatalogError } from "@/lib/catalog/model";
import { catalogFailure, catalogResponse } from "@/lib/catalog/http";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!catalogEnabled()) throw new CatalogError("Image not found.", 404);
    const { id } = await params;
    if (!uuid(id)) throw new CatalogError("Image not found.", 404);
    let record = (
      await publicBlogClient()!
        .from("catalog_media")
        .select("path,state")
        .eq("id", id)
        .eq("state", "ready")
        .maybeSingle()
    ).data;
    if (!record) {
      const { client } = await catalogAdmin();
      record = (
        await client
          .from("catalog_media")
          .select("path,state")
          .eq("id", id)
          .eq("state", "ready")
          .maybeSingle()
      ).data;
    }
    if (!record) throw new CatalogError("Image not found.", 404);
    const { data, error } = await serviceBlogClient()
      .storage.from("catalog-media")
      .download(record.path);
    if (error || !data) throw new CatalogError("Image not found.", 404);
    return new Response(data, {
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Image not found.", {
      status: 404,
      headers: {
        "Cache-Control": "private, no-store",
        "X-Robots-Tag": "noindex",
      },
    });
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    assertCatalogOrigin(request);
    const { client } = await catalogAdmin();
    requireCatalogConnection(true);
    const { id } = await params;
    if (!uuid(id)) throw new CatalogError("Choose an image.");
    const { data, error } = await client
      .from("catalog_media")
      .select("path")
      .eq("id", id)
      .single();
    catalogDatabaseError(error);
    if (!data) throw new CatalogError("Image not found.", 404);
    const removed = await client.storage
      .from("catalog-media")
      .remove([data.path]);
    if (removed.error)
      throw new CatalogError(
        "Storage cleanup failed; the image record has been retained.",
        503,
      );
    const deleted = await client.from("catalog_media").delete().eq("id", id);
    catalogDatabaseError(deleted.error);
    return catalogResponse({ removed: true });
  } catch (error) {
    return catalogFailure(error);
  }
}
