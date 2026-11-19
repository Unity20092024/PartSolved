import { randomUUID } from "node:crypto";
import {
  catalogAdmin,
  assertCatalogOrigin,
  requireCatalogConnection,
  catalogDatabaseError,
  adminProduct,
  adminCatalogList,
  catalogCollections,
} from "@/lib/catalog/server";
import {
  cleanProduct,
  CatalogError,
  text,
  httpsUrl,
  verification,
  uuid,
  slugPattern,
  enumValue,
} from "@/lib/catalog/model";
import { catalogResponse, catalogFailure } from "@/lib/catalog/http";
import { readJson } from "@/lib/blog/http";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await catalogAdmin();
    requireCatalogConnection();
    const params = new URL(request.url).searchParams;
    if (params.get("view") === "dashboard") {
      const page = Number(params.get("page") || 1);
      if (!Number.isSafeInteger(page) || page < 1 || page > 1000)
        throw new CatalogError("Choose a valid page.");
      return catalogResponse({
        ...(await adminCatalogList(page)),
        collections: await catalogCollections(true),
      });
    }
    const id = params.get("id");
    if (!uuid(id)) throw new CatalogError("Choose a product.");
    const product = await adminProduct(id);
    if (!product) throw new CatalogError("Product not found.", 404);
    return catalogResponse(product);
  } catch (error) {
    return catalogFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertCatalogOrigin(request);
    const { client } = await catalogAdmin();
    requireCatalogConnection(true);
    const body = await readJson(request);
    if (body.action === "save") {
      const document = cleanProduct(body.document);
      const { error } = await client.rpc("catalog_save_product", {
        p_document: document,
      });
      catalogDatabaseError(error);
      return catalogResponse(await adminProduct(document.id));
    }
    if (body.action === "transition") {
      if (!uuid(body.id) || !Number.isSafeInteger(body.revision))
        throw new CatalogError("Reload the product.");
      const status = enumValue(body.status, [
        "draft",
        "review",
        "published",
        "archived",
      ] as const);
      const { error } = await client.rpc("catalog_transition", {
        p_id: body.id,
        p_revision: body.revision,
        p_status: status,
      });
      catalogDatabaseError(error);
      return catalogResponse(await adminProduct(body.id));
    }
    if (body.action === "entity") {
      const kind = enumValue(body.kind, ["manufacturer", "supplier"] as const),
        id = body.id ? String(body.id) : randomUUID(),
        slug = text(body.slug, 100, true);
      if (!uuid(id) || !slugPattern.test(slug))
        throw new CatalogError("Choose a valid ID and lowercase slug.");
      const record = {
        id,
        name: text(body.name, 120, true),
        slug,
        ...(kind === "supplier"
          ? { website_url: httpsUrl(body.website_url || "") }
          : {}),
      };
      const { data, error } = await client
        .from(
          kind === "manufacturer"
            ? "catalog_manufacturers"
            : "catalog_suppliers",
        )
        .upsert(record)
        .select("*")
        .single();
      catalogDatabaseError(error);
      return catalogResponse(data);
    }
    if (body.action === "source") {
      const id = body.id ? String(body.id) : randomUUID();
      if (!uuid(id)) throw new CatalogError("Invalid source record.");
      const { data, error } = await client
        .from("catalog_sources")
        .upsert({
          id,
          reference: text(body.reference, 500, true),
          evidence_url: httpsUrl(body.evidence_url || ""),
          verified_at: body.verified_at
            ? verification({ source_id: id, verified_at: body.verified_at })
                .verified_at
            : null,
        })
        .select("*")
        .single();
      catalogDatabaseError(error);
      return catalogResponse(data);
    }
    if (body.action === "rollback") {
      if (!uuid(body.id)) throw new CatalogError("Choose a batch.");
      const { error } = await client.rpc("catalog_rollback_import", {
        p_id: body.id,
      });
      catalogDatabaseError(error);
      return catalogResponse({ rolled_back: true });
    }
    if (body.action === "media-review") {
      if (!uuid(body.id)) throw new CatalogError("Choose an image.");
      const permission = enumValue(body.permission, [
          "pending",
          "approved",
          "revoked",
        ] as const),
        verify = verification(body);
      if (
        permission === "approved" &&
        (!verify.source_id || !verify.verified_at)
      )
        throw new CatalogError(
          "Record the reviewed permission source and verification date before approving an image.",
        );
      const { data, error } = await client
        .from("catalog_media")
        .update({
          permission,
          alt: text(body.alt, 300, true),
          attribution: text(body.attribution || "", 1000),
          rights_reference: text(body.rights_reference, 1000, true),
          ...verify,
        })
        .eq("id", body.id)
        .select("*")
        .single();
      catalogDatabaseError(error);
      return catalogResponse(data);
    }
    throw new CatalogError("Choose a supported catalog action.");
  } catch (error) {
    return catalogFailure(error);
  }
}
