import "server-only";
import { cache } from "react";
import {
  publicBlogClient,
  requireBlogAdmin,
  BlogError,
  blogConfig,
} from "@/lib/blog/server";
import { SITE_ORIGIN } from "@/config/site";
import {
  CatalogError,
  dimensionMm,
  type CatalogCollections,
  type CatalogProduct,
  type ProductDraft,
  type CatalogHit,
} from "./model";
import { classifyHit, type SearchFilters } from "./search";
export const catalogEnabled = () =>
  process.env.CATALOG_ENABLED === "true" && !!blogConfig();
export const catalogWritesEnabled = () =>
  catalogEnabled() &&
  process.env.CATALOG_WRITES_ENABLED === "true" &&
  !!process.env.SUPABASE_SECRET_KEY;
export function requireCatalogConnection(write = false) {
  if (!catalogEnabled() || (write && !catalogWritesEnabled()))
    throw new CatalogError(
      "Catalog connection/writes are disabled pending migration approval and verification.",
      503,
    );
}
export function assertCatalogOrigin(request: Request) {
  const expected =
    process.env.CATALOG_ADMIN_ORIGIN ||
    (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL
      ? `https://${process.env.VERCEL_BRANCH_URL}`
      : process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN);
  if (
    request.headers.get("origin") !== expected ||
    (request.headers.get("host") || new URL(request.url).host) !==
      new URL(expected).host ||
    ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))
  )
    throw new CatalogError(
      "Use the catalog dashboard on its configured origin.",
      403,
    );
}
export async function catalogAdmin() {
  try {
    return await requireBlogAdmin();
  } catch (error) {
    if (error instanceof BlogError)
      throw new CatalogError(
        error.status === 401
          ? "Sign in with your existing administrator account."
          : "Administrator access is required.",
        error.status,
      );
    throw error;
  }
}
export function catalogDatabaseError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "40001")
    throw new CatalogError(
      "This record changed in another tab. Your edits are retained; reload before saving.",
      409,
    );
  if (error.code === "23505")
    throw new CatalogError(
      "Duplicate product slug, variant key, manufacturer number or supplier SKU. Review the source records.",
      409,
    );
  if (error.code === "42501")
    throw new CatalogError("Administrator authorization is required.", 403);
  if (error.code === "23503")
    throw new CatalogError(
      "This record is referenced elsewhere. Review dependencies before removing it.",
      409,
    );
  throw new CatalogError(
    "The database rejected this operation. Check verification, required fields and record references.",
    422,
  );
}
export async function catalogCollections(
  admin = false,
): Promise<CatalogCollections> {
  const client = admin ? (await catalogAdmin()).client : publicBlogClient();
  if (!client || !catalogEnabled())
    return { manufacturers: [], suppliers: [], sources: [] };
  const results = await Promise.all([
    client.from("catalog_manufacturers").select("*").order("name").limit(500),
    client.from("catalog_suppliers").select("*").order("name").limit(500),
    client.from("catalog_sources").select("*").order("reference").limit(500),
  ]);
  results.forEach((r) => catalogDatabaseError(r.error));
  return {
    manufacturers: results[0].data || [],
    suppliers: results[1].data || [],
    sources: results[2].data || [],
  };
}
export async function searchCatalog(f: SearchFilters) {
  if (!catalogEnabled())
    return { rows: [] as CatalogHit[], total: 0, configured: false };
  const client = publicBlogClient()!;
  const { data, error } = await client.rpc("catalog_search", {
    p_query: f.q,
    p_filters: {
      ...f,
      min_mm: f.min ? String(dimensionMm(Number(f.min), f.unit)) : "",
      max_mm: f.max ? String(dimensionMm(Number(f.max), f.unit)) : "",
    },
    p_limit: 12,
    p_offset: (f.page - 1) * 12,
  });
  catalogDatabaseError(error);
  return {
    rows: (data.rows as CatalogHit[]).map((h) => ({
      ...h,
      match: classifyHit(h, f.q),
    })),
    total: Number(data.total),
    configured: true,
  };
}
export const publicCatalogProduct = cache(
  async (slug: string): Promise<CatalogProduct | null> => {
    if (!catalogEnabled()) return null;
    const client = publicBlogClient()!;
    const { data: row, error } = await client
      .from("catalog_products")
      .select("id")
      .eq("slug", slug)
      .eq("status", "published")
      .eq("synthetic", false)
      .maybeSingle();
    catalogDatabaseError(error);
    if (!row) return null;
    const { data, error: detail } = await client.rpc("catalog_document", {
      p_id: row.id,
    });
    catalogDatabaseError(detail);
    return data as CatalogProduct;
  },
);
export async function adminProduct(id: string) {
  requireCatalogConnection();
  const { client } = await catalogAdmin();
  const { data, error } = await client.rpc("catalog_document", { p_id: id });
  catalogDatabaseError(error);
  return data as CatalogProduct | null;
}
export async function adminCatalogList(page = 1) {
  requireCatalogConnection();
  const { client } = await catalogAdmin();
  const { data, error, count } = await client
    .from("catalog_products")
    .select("id,title,slug,status,revision,synthetic,updated_at", {
      count: "exact",
    })
    .order("updated_at", { ascending: false })
    .order("id")
    .range((page - 1) * 50, page * 50 - 1);
  catalogDatabaseError(error);
  const batches = await client
    .from("catalog_import_batches")
    .select("id,status,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  catalogDatabaseError(batches.error);
  return {
    page,
    products: data || [],
    total: count || 0,
    batches: batches.data || [],
  };
}
export async function detectExistingDuplicates(documents: ProductDraft[]) {
  const { client } = await catalogAdmin();
  const slugs = documents.map((p) => p.slug);
  const existing = await client
    .from("catalog_products")
    .select("slug")
    .in("slug", slugs);
  catalogDatabaseError(existing.error);
  if (existing.data?.length)
    throw new CatalogError(
      "A product slug already exists. Imports never overwrite existing records.",
      409,
    );
  const numbers = documents.flatMap((p) =>
    p.variants.flatMap((v) =>
      v.numbers.map((n) => ({
        manufacturer: p.manufacturer_id,
        value: n.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      })),
    ),
  );
  const offers = documents.flatMap((p) =>
    p.variants.flatMap((v) =>
      v.offers.map((o) => ({
        supplier: o.supplier_id,
        value: o.sku.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      })),
    ),
  );
  if (numbers.length) {
    const r = await client
      .from("catalog_identifiers")
      .select("manufacturer_id,normalized_number")
      .in("normalized_number", [...new Set(numbers.map((n) => n.value))])
      .limit(1000);
    catalogDatabaseError(r.error);
    if (
      r.data?.some((n) =>
        numbers.some(
          (candidate) =>
            candidate.manufacturer === n.manufacturer_id &&
            candidate.value === n.normalized_number,
        ),
      )
    )
      throw new CatalogError(
        "Possible existing manufacturer-number duplicate. Review it manually; no replacement equivalence is inferred.",
        409,
      );
  }
  if (offers.length) {
    const r = await client
      .from("catalog_offers")
      .select("supplier_id,normalized_sku")
      .in("normalized_sku", [...new Set(offers.map((n) => n.value))])
      .limit(1000);
    catalogDatabaseError(r.error);
    if (
      r.data?.some((n) =>
        offers.some(
          (candidate) =>
            candidate.supplier === n.supplier_id &&
            candidate.value === n.normalized_sku,
        ),
      )
    )
      throw new CatalogError(
        "A supplier SKU may already exist. Review it before importing.",
        409,
      );
  }
}
export async function catalogSitemap() {
  if (!catalogEnabled()) return [];
  const client = publicBlogClient()!;
  const products: { slug: string; updated_at: string }[] = [];
  for (let offset = 0; offset < 49000; offset += 1000) {
    const { data, error } = await client
      .from("catalog_products")
      .select("slug,updated_at")
      .eq("status", "published")
      .eq("synthetic", false)
      .order("id")
      .range(offset, offset + 999);
    catalogDatabaseError(error);
    products.push(...(data || []));
    if (!data || data.length < 1000) return products;
  }
  throw new CatalogError(
    "The product sitemap requires sharding before expanding further.",
    503,
  );
}
