import {
  CatalogError,
  cleanProduct,
  newProduct,
  newVariant,
  normalizePartNumber,
  exactPartNumber,
  partNumber,
  catalogFamilies,
  type CatalogCollections,
  type ProductDraft,
} from "./model";
export const MAX_IMPORT_BYTES = 3 * 1024 * 1024,
  MAX_IMPORT_ROWS = 500,
  MAX_IMPORT_COLUMNS = 40;
export const importFields = [
  "product_slug",
  "title",
  "description",
  "manufacturer_slug",
  "family_id",
  "variant_key",
  "manufacturer_part_number",
  "alternate_part_number",
  "supplier_slug",
  "supplier_sku",
  "finish",
  "color",
  "handedness",
  "material",
  "measurement_key",
  "measurement_label",
  "measurement_value",
  "measurement_unit",
  "verified_at",
] as const;
export type ImportField = (typeof importFields)[number];
export type ImportSheet = {
  headers: string[];
  rows: string[][];
  numericCells: string[];
  notice: string;
};
export type FieldMapping = Partial<Record<ImportField, string>>;
export type ImportPlan = {
  products: ProductDraft[];
  errors: { row: number; message: string }[];
  counts: { rows: number; products: number; variants: number; offers: number };
};
export function csvSheet(input: string): ImportSheet {
  if (new TextEncoder().encode(input).length > MAX_IMPORT_BYTES)
    throw new CatalogError("Use an import file of at most 3 MiB.", 413);
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  const pushCell = () => {
    if (cell.length > 4000)
      throw new CatalogError(
        "Each import cell must be at most 4,000 characters.",
      );
    row.push(cell);
    cell = "";
    closed = false;
    if (row.length > MAX_IMPORT_COLUMNS)
      throw new CatalogError("Use at most 40 columns.");
  };
  const pushRow = () => {
    pushCell();
    if (row.some((c) => c.trim())) rows.push(row);
    row = [];
    if (rows.length > MAX_IMPORT_ROWS + 1)
      throw new CatalogError("Import at most 500 data rows at a time.");
  };
  const source = input.replace(/^\uFEFF/, "");
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === '"') {
        if (source[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new CatalogError("Invalid CSV quoting.");
      quoted = true;
    } else if (c === ",") pushCell();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && source[i + 1] === "\n") i++;
      pushRow();
    } else {
      if (closed)
        throw new CatalogError(
          "Expected a comma or line break after a quoted CSV cell.",
        );
      cell += c;
    }
  }
  if (quoted) throw new CatalogError("The CSV has an unclosed quoted cell.");
  if (cell || row.length || closed) pushRow();
  return checkedSheet(
    rows,
    [],
    "CSV text is read literally; formulas are never evaluated.",
  );
}
export function checkedSheet(
  rows: string[][],
  numericCells: string[],
  notice: string,
): ImportSheet {
  if (rows.length < 2 || rows.length > MAX_IMPORT_ROWS + 1)
    throw new CatalogError("Include column headers and 1–500 data rows.");
  const headers = rows[0].map((h) => h.trim());
  if (
    headers.length > MAX_IMPORT_COLUMNS ||
    headers.some((h) => !h || h.length > 100) ||
    new Set(headers).size !== headers.length
  )
    throw new CatalogError(
      "Use 1–40 unique, nonempty column headers (100 characters each).",
    );
  if (
    rows
      .slice(1)
      .some((r) => r.length > headers.length || r.some((c) => c.length > 4000))
  )
    throw new CatalogError(
      "Review rows with excess columns or oversized cells.",
    );
  return {
    headers,
    rows: rows.slice(1).map((r) => headers.map((_, i) => r[i] || "")),
    numericCells,
    notice,
  };
}
export function defaultMapping(headers: string[]): FieldMapping {
  return Object.fromEntries(
    importFields.filter((f) => headers.includes(f)).map((f) => [f, f]),
  );
}
export function planImport(
  sheet: ImportSheet,
  mapping: FieldMapping,
  collections: CatalogCollections,
  sourceId: string,
  synthetic: boolean,
): ImportPlan {
  if (
    !sheet ||
    !Array.isArray(sheet.headers) ||
    !Array.isArray(sheet.rows) ||
    !Array.isArray(sheet.numericCells) ||
    sheet.headers.some((h) => typeof h !== "string" || h.length > 100) ||
    sheet.rows.some(
      (row) =>
        !Array.isArray(row) ||
        row.length > MAX_IMPORT_COLUMNS ||
        row.some((cell) => typeof cell !== "string" || cell.length > 4000),
    ) ||
    sheet.numericCells.length > MAX_IMPORT_ROWS * MAX_IMPORT_COLUMNS ||
    sheet.numericCells.some((c) => typeof c !== "string" || c.length > 20) ||
    !mapping ||
    typeof mapping !== "object" ||
    Array.isArray(mapping)
  )
    throw new CatalogError(
      "Use a valid bounded import sheet and field mappings.",
    );
  if (!collections.sources.some((s) => s.id === sourceId))
    throw new CatalogError(
      "Choose the source provenance record for this import.",
    );
  if (
    sheet.rows.length > MAX_IMPORT_ROWS ||
    sheet.headers.length > MAX_IMPORT_COLUMNS
  )
    throw new CatalogError("The import is too large.");
  for (const required of [
    "product_slug",
    "title",
    "manufacturer_slug",
    "family_id",
  ] as const)
    if (!mapping[required] || !sheet.headers.includes(mapping[required]!))
      throw new CatalogError(`Map the required ${required} column.`);
  for (const [field, header] of Object.entries(mapping))
    if (
      !importFields.includes(field as ImportField) ||
      !sheet.headers.includes(header!)
    )
      throw new CatalogError("Review the selected field mappings.");
  const selected = Object.values(mapping).filter(Boolean);
  if (new Set(selected).size !== selected.length)
    throw new CatalogError("Map each source column to one field only.");
  const products = new Map<string, ProductDraft>(),
    fingerprints = new Set<string>(),
    manufacturerNumbers = new Map<string, string>(),
    supplierNumbers = new Map<string, string>();
  const errors: ImportPlan["errors"] = [];
  sheet.rows.forEach((row, index) => {
    try {
      const data = Object.fromEntries(
        importFields.map((f) => [
          f,
          mapping[f]
            ? row[sheet.headers.indexOf(mapping[f]!)]?.trim() || ""
            : "",
        ]),
      ) as Record<ImportField, string>;
      if (fingerprints.has(JSON.stringify(data)))
        throw new CatalogError(
          "Duplicate row. Remove the repeated source row.",
        );
      fingerprints.add(JSON.stringify(data));
      for (const field of [
        "manufacturer_part_number",
        "alternate_part_number",
        "supplier_sku",
      ] as const) {
        const col = sheet.headers.indexOf(mapping[field] || "");
        if (data[field] && sheet.numericCells.includes(`${index + 2}:${col}`))
          throw new CatalogError(
            "Identifier cells must be text in Excel so leading zeros are not lost.",
          );
      }
      const manufacturer = collections.manufacturers.find(
        (m) => m.slug === data.manufacturer_slug,
      );
      if (!manufacturer)
        throw new CatalogError(
          "Unknown manufacturer slug. Add/review the manufacturer first.",
        );
      if (!catalogFamilies.some((f) => f.id === data.family_id))
        throw new CatalogError("Unknown PartSolved family ID.");
      if (!data.manufacturer_part_number && !data.supplier_sku)
        throw new CatalogError(
          "Provide a manufacturer part number or supplier SKU.",
        );
      let product = products.get(data.product_slug);
      const verified_at = data.verified_at
        ? new Date(data.verified_at).toISOString()
        : null;
      if (!product) {
        product = {
          ...newProduct(),
          slug: data.product_slug,
          title: data.title,
          description: data.description,
          manufacturer_id: manufacturer.id,
          family_id: data.family_id,
          source_id: sourceId,
          verified_at,
          synthetic,
          variants: [],
        };
        products.set(data.product_slug, product);
      } else if (
        product.title !== data.title ||
        product.description !== data.description ||
        product.manufacturer_id !== manufacturer.id ||
        product.family_id !== data.family_id ||
        product.verified_at !== verified_at
      )
        throw new CatalogError(
          "Rows sharing a product slug must agree on title, manufacturer, family, description and verification date.",
        );
      const key = data.variant_key || "standard";
      let variant = product.variants.find((v) => v.key === key);
      const handedness = (data.handedness || "unknown") as "unknown";
      if (!variant) {
        variant = {
          ...newVariant(),
          key,
          finish: data.finish,
          color: data.color,
          material: data.material,
          handedness,
          source_id: sourceId,
          verified_at,
        };
        product.variants.push(variant);
      } else if (
        variant.finish !== data.finish ||
        variant.color !== data.color ||
        variant.material !== data.material ||
        variant.handedness !== handedness
      )
        throw new CatalogError(
          "Conflicting attributes for the same variant key.",
        );
      const identity = `${product.slug}:${key}`;
      for (const [field, kind] of [
        ["manufacturer_part_number", "manufacturer"],
        ["alternate_part_number", "alternate"],
      ] as const)
        if (data[field]) {
          const number = partNumber(data[field]),
            lookup = `${manufacturer.id}:${normalizePartNumber(number)}`,
            existing = manufacturerNumbers.get(lookup);
          if (existing && existing !== identity)
            throw new CatalogError(
              "Possible duplicate manufacturer number across different products/variants. Review manually; no equivalence is assumed.",
            );
          manufacturerNumbers.set(lookup, identity);
          if (
            !variant.numbers.some(
              (n) => exactPartNumber(n.value) === exactPartNumber(number),
            )
          )
            variant.numbers.push({
              id: crypto.randomUUID(),
              kind,
              value: number,
              source_id: sourceId,
              verified_at,
            });
        }
      if (data.supplier_sku) {
        const supplier = collections.suppliers.find(
          (s) => s.slug === data.supplier_slug,
        );
        if (!supplier)
          throw new CatalogError(
            "Unknown supplier slug. Add/review the supplier first.",
          );
        const sku = partNumber(data.supplier_sku),
          lookup = `${supplier.id}:${normalizePartNumber(sku)}`,
          existing = supplierNumbers.get(lookup);
        if (existing && existing !== identity)
          throw new CatalogError(
            "Supplier SKU is assigned to different variants. Review the source.",
          );
        supplierNumbers.set(lookup, identity);
        if (
          !variant.offers.some(
            (o) =>
              o.supplier_id === supplier.id &&
              exactPartNumber(o.sku) === exactPartNumber(sku),
          )
        )
          variant.offers.push({
            id: crypto.randomUUID(),
            supplier_id: supplier.id,
            sku,
            availability: "unknown",
            source_id: sourceId,
            verified_at,
          });
      }
      if (data.measurement_value || data.measurement_key) {
        const dimension = {
          id: crypto.randomUUID(),
          key: data.measurement_key,
          label: data.measurement_label || data.measurement_key,
          value: Number(data.measurement_value),
          unit: data.measurement_unit as "mm" | "in",
          source_id: sourceId,
          verified_at,
        };
        const previous = variant.dimensions.find(
          (d) => d.key === dimension.key,
        );
        if (
          previous &&
          (previous.value !== dimension.value ||
            previous.unit !== dimension.unit)
        )
          throw new CatalogError(
            "Conflicting values for the same measurement key.",
          );
        if (!previous) variant.dimensions.push(dimension);
      }
    } catch (cause) {
      errors.push({
        row: index + 2,
        message: cause instanceof Error ? cause.message : "Invalid import row.",
      });
    }
  });
  const cleaned: ProductDraft[] = [];
  for (const product of products.values())
    try {
      cleaned.push(cleanProduct(product));
    } catch (cause) {
      errors.push({
        row: 0,
        message: `${product.slug}: ${cause instanceof Error ? cause.message : "Invalid product."}`,
      });
    }
  if (JSON.stringify(cleaned).length > 2 * 1024 * 1024)
    throw new CatalogError("Split this import into smaller files.", 413);
  return {
    products: errors.length ? [] : cleaned,
    errors: errors.slice(0, 100),
    counts: {
      rows: sheet.rows.length,
      products: cleaned.length,
      variants: cleaned.reduce((n, p) => n + p.variants.length, 0),
      offers: cleaned.reduce(
        (n, p) => n + p.variants.reduce((s, v) => s + v.offers.length, 0),
        0,
      ),
    },
  };
}
