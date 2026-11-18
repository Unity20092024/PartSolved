"use client";
import { compressArticleImage } from "@/components/admin/blog/client-api";
import {
  CatalogError,
  cleanProduct,
  text,
  slugPattern,
  httpsUrl,
  verification,
  normalizePartNumber,
  type CatalogProduct,
  type ProductDraft,
  type CatalogEntity,
  type CatalogCollections,
  type CatalogSource,
  type CatalogMedia,
} from "@/lib/catalog/model";
import {
  csvSheet,
  planImport,
  type ImportSheet,
  type FieldMapping,
} from "@/lib/catalog/imports";
import {
  httpCatalogPort,
  type CatalogPort,
  type CatalogDashboardData,
  type MediaUpload,
} from "./catalog-port";
type MemoryBatch = {
  id: string;
  status: string;
  created_at: string;
  payload: string;
  items: { id: string; revision: number }[];
};
export class RehearsalCatalogPort implements CatalogPort {
  private products: CatalogProduct[];
  private collections: CatalogCollections;
  private batches: MemoryBatch[] = [];
  private urls: string[] = [];
  constructor(data: {
    products: CatalogProduct[];
    collections: CatalogCollections;
  }) {
    this.products = structuredClone(data.products);
    this.collections = structuredClone(data.collections);
  }
  snapshot(): CatalogDashboardData {
    return structuredClone({
      products: this.products,
      total: this.products.length,
      batches: this.batches,
      collections: this.collections,
    });
  }
  async refresh() {
    return this.snapshot();
  }
  async load(id: string) {
    const p = this.products.find((p) => p.id === id);
    if (!p) throw new CatalogError("Rehearsal product not found.");
    return this.decorate(p);
  }
  private record(d: ProductDraft): CatalogProduct {
    const previous = this.products.find((p) => p.id === d.id);
    if (previous && previous.revision !== d.revision)
      throw new CatalogError("This record changed. Reload before saving.", 409);
    if ((previous?.synthetic && !d.synthetic) || !d.synthetic)
      throw new CatalogError("Rehearsal records must remain synthetic.");
    if (this.products.some((p) => p.id !== d.id && p.slug === d.slug))
      throw new CatalogError("Duplicate product slug.");
    return {
      ...d,
      status: "draft",
      revision: (previous?.revision || 0) + 1,
      created_at: previous?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      manufacturer_name:
        this.collections.manufacturers.find((m) => m.id === d.manufacturer_id)
          ?.name || "",
      media: previous?.media || [],
    };
  }
  async save(input: ProductDraft) {
    const p = this.record(cleanProduct(input));
    this.products = [p, ...this.products.filter((r) => r.id !== p.id)];
    return structuredClone(p);
  }
  async transition(input: CatalogProduct, status: string) {
    const p = await this.load(input.id);
    if (status === "published")
      throw new CatalogError("Synthetic records cannot be published.");
    if (!["draft", "review", "archived"].includes(status))
      throw new CatalogError("Unsupported state.");
    if (p.revision !== input.revision)
      throw new CatalogError("Reload the current revision.");
    p.status = status as CatalogProduct["status"];
    p.revision++;
    this.products = this.products.map((r) => (r.id === p.id ? p : r));
    return p;
  }
  async entity(
    kind: "manufacturer" | "supplier",
    input: Partial<CatalogEntity>,
  ) {
    const id = input.id || crypto.randomUUID(),
      slug = text(input.slug, 100, true);
    if (!slugPattern.test(slug))
      throw new CatalogError("Use a lowercase organization slug.");
    const list =
      kind === "manufacturer"
        ? this.collections.manufacturers
        : this.collections.suppliers;
    if (list.some((e) => e.id !== id && e.slug === slug))
      throw new CatalogError("Organization slug already exists.");
    const record = {
      id,
      slug,
      name: text(input.name, 120, true),
      ...(kind === "supplier"
        ? { website_url: httpsUrl(input.website_url || "") }
        : {}),
    };
    if (kind === "manufacturer")
      this.collections.manufacturers = [
        record,
        ...list.filter((e) => e.id !== id),
      ];
    else
      this.collections.suppliers = [record, ...list.filter((e) => e.id !== id)];
    return record;
  }
  async source(input: Partial<CatalogSource>) {
    const id = input.id || crypto.randomUUID();
    const source = {
      id,
      reference: text(input.reference, 500, true),
      evidence_url: httpsUrl(input.evidence_url || ""),
      verified_at: verification({
        source_id: id,
        verified_at: input.verified_at,
      }).verified_at,
    };
    this.collections.sources = [
      source,
      ...this.collections.sources.filter((s) => s.id !== id),
    ];
    return source;
  }
  async parse(file: File) {
    if (file.name.toLowerCase().endsWith(".csv"))
      return csvSheet(await file.text());
    return httpCatalogPort.parse(file);
  }
  async preview(
    sheet: ImportSheet,
    mapping: FieldMapping,
    _collections: CatalogCollections,
    source: string,
    synthetic: boolean,
  ) {
    if (!synthetic)
      throw new CatalogError("Use synthetic records in the rehearsal.");
    const plan = planImport(sheet, mapping, this.collections, source, true);
    if (!plan.errors.length) this.duplicates(plan.products);
    return plan;
  }
  private duplicates(documents: ProductDraft[]) {
    for (const product of documents) {
      if (
        this.products.some(
          (p) => p.id === product.id || p.slug === product.slug,
        )
      )
        throw new CatalogError(
          "A product slug already exists. Imports do not overwrite records.",
        );
      for (const v of product.variants)
        for (const existing of this.products)
          for (const ev of existing.variants) {
            if (
              existing.manufacturer_id === product.manufacturer_id &&
              v.numbers.some((n) =>
                ev.numbers.some(
                  (en) =>
                    normalizePartNumber(n.value) ===
                    normalizePartNumber(en.value),
                ),
              )
            )
              throw new CatalogError(
                "Possible existing manufacturer-number duplicate. Review manually.",
              );
            if (
              v.offers.some((o) =>
                ev.offers.some(
                  (eo) =>
                    o.supplier_id === eo.supplier_id &&
                    normalizePartNumber(o.sku) === normalizePartNumber(eo.sku),
                ),
              )
            )
              throw new CatalogError(
                "Possible existing supplier SKU duplicate.",
              );
          }
    }
  }
  async commit(
    documents: ProductDraft[],
    id: string,
    source: string,
    synthetic: boolean,
  ) {
    if (!synthetic || documents.length > 10 || !documents.length)
      throw new CatalogError("Commit 1–10 synthetic product drafts.");
    const payload = JSON.stringify({ documents, source, synthetic }),
      existing = this.batches.find((b) => b.id === id);
    if (existing) {
      if (existing.payload !== payload || existing.status !== "committed")
        throw new CatalogError("Batch ID was already used.");
      return { batch_id: id };
    }
    const cleaned = documents.map(cleanProduct);
    this.duplicates(cleaned);
    const records = cleaned.map((p) => this.record(p));
    this.products = [...records, ...this.products];
    this.batches.unshift({
      id,
      status: "committed",
      created_at: new Date().toISOString(),
      payload,
      items: records.map((p) => ({ id: p.id, revision: p.revision })),
    });
    return { batch_id: id };
  }
  async rollback(id: string) {
    const batch = this.batches.find((b) => b.id === id);
    if (!batch) throw new CatalogError("Batch not found.");
    if (batch.status === "rolled_back") return;
    const ids = new Set(batch.items.map((i) => i.id));
    for (const item of batch.items) {
      const p = this.products.find((p) => p.id === item.id);
      if (
        !p ||
        p.revision !== item.revision ||
        p.status !== "draft" ||
        p.media.length
      )
        throw new CatalogError(
          "Unsafe rollback: an imported record was edited, published or has media.",
        );
    }
    const variants = new Set(
      this.products
        .filter((p) => ids.has(p.id))
        .flatMap((p) => p.variants.map((v) => v.id)),
    );
    if (
      this.products
        .filter((p) => !ids.has(p.id))
        .some((p) =>
          p.variants.some((v) =>
            v.compatibility.some(
              (c) => c.target_variant_id && variants.has(c.target_variant_id),
            ),
          ),
        )
    )
      throw new CatalogError("Other records reference an imported variant.");
    this.products = this.products.filter((p) => !ids.has(p.id));
    batch.status = "rolled_back";
  }
  private async updateMedia(
    productId: string,
    change: (p: CatalogProduct) => CatalogProduct,
  ) {
    const p = await this.load(productId);
    const next = change(p);
    next.revision++;
    next.status = "draft";
    this.products = this.products.map((p) => (p.id === next.id ? next : p));
  }
  async upload(meta: MediaUpload, file: File) {
    if (!meta.rights_confirmed)
      throw new CatalogError("Confirm permission to upload.");
    const blob = await compressArticleImage(file),
      bitmap = await createImageBitmap(blob),
      path = URL.createObjectURL(blob);
    this.urls.push(path);
    const media: CatalogMedia = {
      id: crypto.randomUUID(),
      product_id: meta.product_id,
      variant_id: null,
      kind: meta.kind,
      path,
      alt: text(meta.alt, 300, true),
      rights_reference: text(meta.rights_reference, 1000, true),
      attribution: text(meta.attribution, 1000),
      permission: "pending",
      state: "ready",
      width: bitmap.width,
      height: bitmap.height,
      bytes: blob.size,
      source_id: null,
      verified_at: null,
    };
    bitmap.close();
    await this.updateMedia(meta.product_id, (p) => ({
      ...p,
      media: [...p.media, media],
    }));
    return media;
  }
  async review(media: CatalogMedia) {
    const verify = verification(media);
    if (
      media.permission === "approved" &&
      (!verify.source_id || !verify.verified_at)
    )
      throw new CatalogError(
        "Review and record permission provenance and date first.",
      );
    await this.updateMedia(media.product_id, (p) => ({
      ...p,
      media: p.media.map((m) =>
        m.id === media.id ? { ...media, ...verify } : m,
      ),
    }));
    return media;
  }
  async remove(media: CatalogMedia) {
    await this.updateMedia(media.product_id, (p) => ({
      ...p,
      media: p.media.filter((m) => m.id !== media.id),
    }));
    if (media.path.startsWith("blob:")) URL.revokeObjectURL(media.path);
  }
  async export(offset: number) {
    return {
      format: "partsolved-catalog-v1-rehearsal",
      synthetic: true,
      total: this.products.length,
      next_offset: offset + 25 < this.products.length ? offset + 25 : null,
      products: structuredClone(this.products.slice(offset, offset + 25)),
      collections: structuredClone(this.collections),
    };
  }
  private decorate(p: CatalogProduct): CatalogProduct {
    return structuredClone({
      ...p,
      manufacturer_name:
        this.collections.manufacturers.find((m) => m.id === p.manufacturer_id)
          ?.name || "",
      variants: p.variants.map((v) => ({
        ...v,
        offers: v.offers.map((o) => ({
          ...o,
          supplier_name:
            this.collections.suppliers.find((s) => s.id === o.supplier_id)
              ?.name || "",
        })),
      })),
    });
  }
  allProducts() {
    return this.products.map((p) => this.decorate(p));
  }
  dispose() {
    this.urls.forEach((url) => URL.revokeObjectURL(url));
  }
}
