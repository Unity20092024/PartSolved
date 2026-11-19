import {
  catalogAdmin,
  requireCatalogConnection,
  catalogDatabaseError,
  catalogCollections,
} from "@/lib/catalog/server";
import { CatalogError } from "@/lib/catalog/model";
import { importFields } from "@/lib/catalog/imports";
import { safeCsv } from "@/lib/catalog/search";
import { catalogFailure } from "@/lib/catalog/http";
export async function GET(request: Request) {
  try {
    const { client } = await catalogAdmin();
    const q = new URL(request.url).searchParams;
    const headers = {
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
    };
    if (q.get("template") === "1")
      return new Response(safeCsv([[...importFields]]), {
        headers: {
          ...headers,
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="partsolved-catalog-template.csv"',
        },
      });
    requireCatalogConnection();
    const offset = Number(q.get("offset") || 0),
      limit = Number(q.get("limit") || 25);
    if (
      !Number.isSafeInteger(offset) ||
      offset < 0 ||
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new CatalogError("Export 1–50 records per page.");
    const { data, error, count } = await client
      .from("catalog_products")
      .select("id", { count: "exact" })
      .order("id")
      .range(offset, offset + limit - 1);
    catalogDatabaseError(error);
    const documents = [];
    for (const row of data || []) {
      const doc = await client.rpc("catalog_document", { p_id: row.id });
      catalogDatabaseError(doc.error);
      documents.push(doc.data);
    }
    const output = JSON.stringify({
      format: "partsolved-catalog-v1",
      total: count,
      next_offset:
        offset + documents.length < Number(count)
          ? offset + documents.length
          : null,
      collections: await catalogCollections(true),
      products: documents,
    });
    if (output.length > 2 * 1024 * 1024)
      throw new CatalogError(
        "Export a smaller page using the limit parameter.",
        413,
      );
    return new Response(output, {
      headers: {
        ...headers,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="partsolved-catalog-${offset}.json"`,
      },
    });
  } catch (error) {
    return catalogFailure(error);
  }
}
