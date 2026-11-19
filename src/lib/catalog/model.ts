import { families } from "@/config/assistance";
import { categories } from "@/config/categories";
export type CatalogStatus = "draft" | "review" | "published" | "archived";
export type Verification = {
  source_id: string | null;
  verified_at: string | null;
};
export type CatalogEntity = {
  id: string;
  name: string;
  slug: string;
  website_url?: string;
};
export type CatalogSource = {
  id: string;
  reference: string;
  evidence_url: string;
  verified_at: string | null;
};
export type CatalogNumber = Verification & {
  id: string;
  kind: "manufacturer" | "alternate";
  value: string;
};
export type CatalogDimension = Verification & {
  id: string;
  key: string;
  label: string;
  value: number;
  unit: "in" | "mm";
};
export type CatalogOffer = Verification & {
  id: string;
  supplier_id: string;
  sku: string;
  availability: "unknown" | "available" | "unavailable" | "discontinued";
  supplier_name?: string;
};
export type CatalogCompatibility = Verification & {
  id: string;
  statement: string;
  target_variant_id: string | null;
};
export type CatalogVariant = Verification & {
  id: string;
  key: string;
  finish: string;
  color: string;
  handedness: "unknown" | "left" | "right" | "non-handed";
  material: string;
  numbers: CatalogNumber[];
  offers: CatalogOffer[];
  dimensions: CatalogDimension[];
  compatibility: CatalogCompatibility[];
};
export type ProductDraft = Verification & {
  id: string;
  revision: number;
  title: string;
  slug: string;
  description: string;
  manufacturer_id: string | null;
  family_id: string;
  synthetic: boolean;
  variants: CatalogVariant[];
};
export type CatalogMedia = Verification & {
  id: string;
  product_id: string;
  variant_id: string | null;
  kind: "photo" | "drawing";
  path: string;
  alt: string;
  attribution: string;
  rights_reference: string;
  permission: "pending" | "approved" | "revoked";
  state: "uploading" | "ready" | "failed";
  width: number;
  height: number;
  bytes: number;
};
export type CatalogProduct = ProductDraft & {
  status: CatalogStatus;
  updated_at: string;
  created_at: string;
  media: CatalogMedia[];
  manufacturer_name?: string;
  import_batch_id?: string | null;
};
export type CatalogCollections = {
  manufacturers: CatalogEntity[];
  suppliers: CatalogEntity[];
  sources: CatalogSource[];
};
export type CatalogHit = {
  product_id: string;
  variant_id: string;
  slug: string;
  title: string;
  description: string;
  manufacturer_id: string | null;
  manufacturer_name: string;
  family_id: string;
  category: string;
  finish: string;
  verified_at: string;
  synthetic: boolean;
  numbers: CatalogNumber[];
  offers: CatalogOffer[];
  dimensions: CatalogDimension[];
  media: CatalogMedia[];
  match?:
    | "exact-identifier"
    | "normalized-candidate"
    | "possible-candidate"
    | "browse";
};
export class CatalogError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const catalogFamilies = families.map(({ id, name, category }) => ({
  id,
  name,
  category,
}));
export const catalogCategories = categories.map(({ slug, title }) => ({
  id: slug,
  name: title,
}));
export const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[a-f\d]{8}-[a-f\d]{4}-[1-5][a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(
    v,
  );
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const normalizePartNumber = (value: string) =>
  value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
export const exactPartNumber = (value: string) => value.trim().toUpperCase();
export function partNumber(value: unknown) {
  const v = text(value, 80, true);
  if (!/^[A-Za-z0-9 ._/#()+-]+$/.test(v) || !normalizePartNumber(v))
    throw new CatalogError(
      "Use a part number containing letters or digits; review unsupported characters.",
    );
  return v;
}
export function text(value: unknown, max: number, required = false): string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)
  )
    throw new CatalogError(`Use text of at most ${max} characters.`);
  const v = value.trim();
  if (required && !v) throw new CatalogError("Complete the required fields.");
  return v;
}
export function httpsUrl(value: unknown, optional = true) {
  const v = text(value, 2048, !optional);
  if (!v) return "";
  try {
    const url = new URL(v);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      /\s/.test(v)
    )
      throw Error();
    return url.href;
  } catch {
    throw new CatalogError("Use an HTTPS URL without embedded credentials.");
  }
}
const object = (v: unknown): Record<string, unknown> => {
  if (!v || typeof v !== "object" || Array.isArray(v))
    throw new CatalogError("Invalid catalog document.");
  return v as Record<string, unknown>;
};
const id = (value: unknown, nullable = false) => {
  if (nullable && (value === null || value === "" || value === undefined))
    return null;
  if (!uuid(value)) throw new CatalogError("Choose a valid catalog record.");
  return value.toLowerCase();
};
export function verification(value: Record<string, unknown>): Verification {
  const source_id = id(value.source_id, true);
  let verified_at: string | null = null;
  if (value.verified_at) {
    const date = new Date(String(value.verified_at));
    if (!Number.isFinite(date.valueOf()) || date.valueOf() > Date.now() + 1000)
      throw new CatalogError(
        "Verification dates must be valid and cannot be in the future.",
      );
    verified_at = date.toISOString();
    if (!source_id)
      throw new CatalogError("Verification requires source provenance.");
  }
  return { source_id, verified_at };
}
function list<T>(
  input: unknown,
  max: number,
  clean: (v: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(input) || input.length > max)
    throw new CatalogError(`Use at most ${max} records in this section.`);
  return input.map((v) => clean(object(v)));
}
export function cleanProduct(input: unknown): ProductDraft {
  const v = object(input),
    slug = text(v.slug, 100, true);
  if (!slugPattern.test(slug))
    throw new CatalogError("Use a lowercase, hyphenated product URL slug.");
  if (!catalogFamilies.some((f) => f.id === v.family_id))
    throw new CatalogError("Choose a supported hardware family.");
  if (typeof v.synthetic !== "boolean")
    throw new CatalogError("Label test data explicitly.");
  if (!Number.isSafeInteger(v.revision) || Number(v.revision) < 0)
    throw new CatalogError("Reload the current catalog revision.");
  const variants = list(v.variants, 20, (r) => ({
    id: id(r.id)!,
    key: text(r.key, 80, true),
    finish: text(r.finish, 80),
    color: text(r.color, 80),
    material: text(r.material, 80),
    handedness: enumValue(r.handedness, [
      "unknown",
      "left",
      "right",
      "non-handed",
    ] as const),
    ...verification(r),
    numbers: list(r.numbers, 30, (n) => ({
      id: id(n.id)!,
      kind: enumValue(n.kind, ["manufacturer", "alternate"] as const),
      value: partNumber(n.value),
      ...verification(n),
    })),
    offers: list(r.offers, 30, (n) => ({
      id: id(n.id)!,
      supplier_id: id(n.supplier_id)!,
      sku: partNumber(n.sku),
      availability: enumValue(n.availability, [
        "unknown",
        "available",
        "unavailable",
        "discontinued",
      ] as const),
      ...verification(n),
    })),
    dimensions: list(r.dimensions, 30, (n) => {
      const key = text(n.key, 80, true),
        value = Number(n.value);
      if (
        !slugPattern.test(key) ||
        !Number.isFinite(value) ||
        value <= 0 ||
        value > 1000000
      )
        throw new CatalogError(
          "Dimensions need a positive decimal value and a descriptive key.",
        );
      return {
        id: id(n.id)!,
        key,
        label: text(n.label, 100, true),
        value,
        unit: enumValue(n.unit, ["in", "mm"] as const),
        ...verification(n),
      };
    }),
    compatibility: list(r.compatibility, 30, (n) => ({
      id: id(n.id)!,
      statement: text(n.statement, 2000, true),
      target_variant_id: id(n.target_variant_id, true),
      ...verification(n),
    })),
  }));
  if (variants.some((v) => v.numbers.length) && !v.manufacturer_id)
    throw new CatalogError(
      "Choose the manufacturer before recording its part numbers.",
    );
  if (!variants.length)
    throw new CatalogError(
      "Add at least one variant, even when its measurements are unknown.",
    );
  const ids = variants.flatMap((v) => [
    v.id,
    ...v.numbers.map((n) => n.id),
    ...v.offers.map((n) => n.id),
    ...v.dimensions.map((n) => n.id),
    ...v.compatibility.map((n) => n.id),
  ]);
  if (
    new Set(ids).size !== ids.length ||
    new Set(variants.map((v) => v.key)).size !== variants.length
  )
    throw new CatalogError("Variant keys and record IDs must be unique.");
  for (const variant of variants) {
    if (
      new Set(variant.dimensions.map((d) => d.key)).size !==
      variant.dimensions.length
    )
      throw new CatalogError("Each variant measurement key must be unique.");
  }
  return {
    id: id(v.id)!,
    revision: Number(v.revision),
    title: text(v.title, 200, true),
    slug,
    description: text(v.description, 10000),
    manufacturer_id: id(v.manufacturer_id, true),
    family_id: String(v.family_id),
    synthetic: v.synthetic,
    ...verification(v),
    variants,
  };
}
export function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
): T {
  if (!values.includes(value as T))
    throw new CatalogError("Choose a supported value.");
  return value as T;
}
export function newVariant(): CatalogVariant {
  return {
    id: crypto.randomUUID(),
    key: "standard",
    finish: "",
    color: "",
    material: "",
    handedness: "unknown",
    source_id: null,
    verified_at: null,
    numbers: [],
    offers: [],
    dimensions: [],
    compatibility: [],
  };
}
export function newProduct(): ProductDraft {
  return {
    id: crypto.randomUUID(),
    revision: 0,
    title: "",
    slug: "",
    description: "",
    manufacturer_id: null,
    family_id: catalogFamilies[0].id,
    synthetic: true,
    source_id: null,
    verified_at: null,
    variants: [newVariant()],
  };
}
export const dimensionMm = (value: number, unit: "in" | "mm") =>
  value * (unit === "in" ? 25.4 : 1);
export function approvedPurchasingUrl(url: string, supplierWebsite: string) {
  try {
    const u = new URL(httpsUrl(url, false)),
      s = new URL(httpsUrl(supplierWebsite, false));
    return u.hostname === s.hostname &&
      !/(?:test|sandbox|checkout|cart)/i.test(u.href)
      ? u.href
      : null;
  } catch {
    return null;
  }
}

// Private future purchasing metadata. No active checkout/affiliate adapter exists.
export type CatalogPurchaseArrangement = Verification & {
  id: string;
  supplier_id: string;
  type: "direct" | "affiliate";
  status: "unconfirmed" | "approved" | "revoked";
  reference: string;
  network: string;
};
export type CatalogPurchaseLink = Verification & {
  id: string;
  offer_id: string;
  supplier_id: string;
  arrangement_id: string;
  url: string;
  approved: boolean;
  tracking_reference: string;
};
