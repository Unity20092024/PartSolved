"use client";
import { compressArticleImage } from "@/components/admin/blog/client-api";
import {
  type ProductDraft,
  type CatalogProduct,
  type CatalogEntity,
  type CatalogSource,
  type CatalogMedia,
  type CatalogCollections,
} from "@/lib/catalog/model";
import type {
  ImportSheet,
  FieldMapping,
  ImportPlan,
} from "@/lib/catalog/imports";
export type CatalogBatch = { id: string; status: string; created_at: string };
export type MediaUpload = {
  product_id: string;
  alt: string;
  kind: "photo" | "drawing";
  rights_reference: string;
  attribution: string;
  rights_confirmed: boolean;
};
export type CatalogListRecord = Pick<
  CatalogProduct,
  "id" | "title" | "slug" | "status" | "revision" | "synthetic" | "updated_at"
>;
export type CatalogDashboardData = {
  page?: number;
  products: CatalogListRecord[];
  total: number;
  batches: CatalogBatch[];
  collections: CatalogCollections;
};
export interface CatalogPort {
  refresh(): Promise<CatalogDashboardData>;
  load(id: string): Promise<CatalogProduct>;
  save(doc: ProductDraft): Promise<CatalogProduct>;
  transition(product: CatalogProduct, status: string): Promise<CatalogProduct>;
  entity(
    kind: "manufacturer" | "supplier",
    data: Partial<CatalogEntity>,
  ): Promise<CatalogEntity>;
  source(data: Partial<CatalogSource>): Promise<CatalogSource>;
  parse(file: File): Promise<ImportSheet>;
  preview(
    sheet: ImportSheet,
    mapping: FieldMapping,
    collections: CatalogCollections,
    source: string,
    synthetic: boolean,
  ): Promise<ImportPlan>;
  commit(
    products: ProductDraft[],
    batch: string,
    source: string,
    synthetic: boolean,
  ): Promise<{ batch_id: string }>;
  rollback(batch: string): Promise<void>;
  upload(meta: MediaUpload, file: File): Promise<CatalogMedia>;
  review(media: CatalogMedia): Promise<CatalogMedia>;
  remove(media: CatalogMedia): Promise<void>;
  export(offset: number): Promise<unknown>;
}
export async function catalogRequest<T>(
  path: string,
  body?: unknown,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    ...(body !== undefined
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json", ...init.headers },
          body: JSON.stringify(body),
        }
      : {}),
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error || "Catalog action failed. Your current edits are retained.",
    );
  return data;
}
export const httpCatalogPort: CatalogPort = {
  refresh: () => catalogRequest("/api/catalog/manage?view=dashboard"),
  load: (id) => catalogRequest(`/api/catalog/manage?id=${id}`),
  save: (document) =>
    catalogRequest("/api/catalog/manage", { action: "save", document }),
  transition: (p, status) =>
    catalogRequest("/api/catalog/manage", {
      action: "transition",
      id: p.id,
      revision: p.revision,
      status,
    }),
  entity: (kind, data) =>
    catalogRequest("/api/catalog/manage", { action: "entity", kind, ...data }),
  source: (data) =>
    catalogRequest("/api/catalog/manage", { action: "source", ...data }),
  async parse(file) {
    const result = await catalogRequest<{ sheet: ImportSheet }>(
      "/api/catalog/import",
      undefined,
      {
        method: "POST",
        headers: {
          "x-import-format": file.name.toLowerCase().split(".").at(-1) || "",
        },
        body: file,
      },
    );
    return result.sheet;
  },
  preview: (sheet, mapping, _collections, source_id, synthetic) =>
    catalogRequest("/api/catalog/import", {
      action: "preview",
      sheet,
      mapping,
      source_id,
      synthetic,
    }),
  commit: (products, id, source_id, synthetic) =>
    catalogRequest("/api/catalog/import", {
      action: "commit",
      products,
      id,
      source_id,
      synthetic,
    }),
  async rollback(id) {
    await catalogRequest("/api/catalog/manage", { action: "rollback", id });
  },
  async upload(meta, file) {
    const blob = await compressArticleImage(file);
    return catalogRequest("/api/catalog/media", undefined, {
      method: "POST",
      headers: { "x-catalog-media": encodeURIComponent(JSON.stringify(meta)) },
      body: blob,
    });
  },
  review: (media) =>
    catalogRequest("/api/catalog/manage", { action: "media-review", ...media }),
  async remove(media) {
    await catalogRequest(`/api/catalog/media/${media.id}`, undefined, {
      method: "DELETE",
    });
  },
  export: (offset) =>
    catalogRequest(`/api/catalog/export?offset=${offset}&limit=25`),
};
export function downloadJson(name: string, value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
