import { createHash } from "node:crypto";
import {
  catalogAdmin,
  assertCatalogOrigin,
  requireCatalogConnection,
  catalogDatabaseError,
  catalogCollections,
  detectExistingDuplicates,
} from "@/lib/catalog/server";
import { CatalogError, cleanProduct, uuid } from "@/lib/catalog/model";
import {
  MAX_IMPORT_BYTES,
  planImport,
  type ImportSheet,
  type FieldMapping,
} from "@/lib/catalog/imports";
import { spreadsheet } from "@/lib/catalog/spreadsheets";
import { catalogResponse, catalogFailure } from "@/lib/catalog/http";
import { limitedBody, readJson } from "@/lib/blog/http";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    assertCatalogOrigin(request);
    const { client } = await catalogAdmin();
    const format = request.headers.get("x-import-format");
    if (format) {
      const bytes = await limitedBody(request, MAX_IMPORT_BYTES);
      const sheet = await spreadsheet(bytes, format);
      return catalogResponse({
        sheet,
        file_hash: createHash("sha256").update(bytes).digest("hex"),
      });
    }
    const body = await readJson(request);
    requireCatalogConnection();
    if (body.action === "preview") {
      const collections = await catalogCollections(true);
      const plan = planImport(
        body.sheet as ImportSheet,
        body.mapping as FieldMapping,
        collections,
        String(body.source_id),
        body.synthetic === true,
      );
      if (!plan.errors.length) await detectExistingDuplicates(plan.products);
      return catalogResponse(plan);
    }
    if (body.action === "commit") {
      requireCatalogConnection(true);
      if (
        !uuid(body.id) ||
        !uuid(body.source_id) ||
        typeof body.synthetic !== "boolean" ||
        !Array.isArray(body.products) ||
        body.products.length < 1 ||
        body.products.length > 10
      )
        throw new CatalogError(
          "Import 1–10 validated product drafts per batch.",
        );
      const products = body.products.map(cleanProduct);
      if (
        products.some(
          (p) =>
            p.revision !== 0 ||
            p.source_id !== body.source_id ||
            p.synthetic !== body.synthetic,
        )
      )
        throw new CatalogError(
          "Imports create new, explicitly labeled drafts only.",
        );
      const hash = createHash("sha256")
        .update(
          JSON.stringify({
            products,
            source_id: body.source_id,
            synthetic: body.synthetic,
          }),
        )
        .digest("hex");
      // A committed retry is handled idempotently by the locked database RPC. Only
      // preflight duplicates for a new batch; never bypass the RPC identity check.
      const previous = await client
        .from("catalog_import_batches")
        .select("id")
        .eq("id", body.id)
        .maybeSingle();
      catalogDatabaseError(previous.error);
      if (!previous.data) await detectExistingDuplicates(products);
      const { data, error } = await client.rpc("catalog_import", {
        p_id: body.id,
        p_hash: hash,
        p_source: body.source_id,
        p_synthetic: body.synthetic,
        p_documents: products,
      });
      catalogDatabaseError(error);
      return catalogResponse({ batch_id: data });
    }
    throw new CatalogError(
      "Choose Parse, Preview mappings or Import draft batches.",
    );
  } catch (error) {
    return catalogFailure(error);
  }
}
