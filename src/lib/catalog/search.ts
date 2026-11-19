import {
  catalogCategories,
  catalogFamilies,
  CatalogError,
  exactPartNumber,
  normalizePartNumber,
  dimensionMm,
  uuid,
  type CatalogHit,
} from "./model";
export type SearchFilters = {
  q: string;
  mode: "all" | "exact" | "normalized" | "partial";
  category: string;
  family: string;
  manufacturer: string;
  supplier: string;
  finish: string;
  measurement: string;
  min: string;
  max: string;
  unit: "in" | "mm";
  page: number;
};
export function searchFilters(params: URLSearchParams): SearchFilters {
  const value = (key: string, max = 100) => {
    const s = params.get(key)?.trim() || "";
    if (s.length > max) throw new CatalogError("Shorten the search filters.");
    return s;
  };
  const q = value("q", 80),
    mode = value("mode") || "all",
    category = value("category"),
    family = value("family"),
    manufacturer = value("manufacturer"),
    supplier = value("supplier"),
    measurement = value("measurement"),
    min = value("min"),
    max = value("max"),
    unit = value("unit") || "mm",
    page = Number(value("page") || 1);
  if (
    !["all", "exact", "normalized", "partial"].includes(mode) ||
    !["in", "mm"].includes(unit) ||
    (category && !catalogCategories.some((c) => c.id === category)) ||
    (family && !catalogFamilies.some((f) => f.id === family)) ||
    (manufacturer && !uuid(manufacturer)) ||
    (supplier && !uuid(supplier)) ||
    (measurement && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(measurement)) ||
    !Number.isSafeInteger(page) ||
    page < 1 ||
    page > 500
  )
    throw new CatalogError("Choose valid search filters.");
  if(mode === "partial" && normalizePartNumber(q).length < 3) throw new CatalogError("Enter at least three characters for a partial number lookup.");
  for (const v of [min, max])
    if (
      v &&
      (!Number.isFinite(Number(v)) || Number(v) <= 0 || Number(v) > 1000000)
    )
      throw new CatalogError("Dimension limits must be positive decimals.");
  if ((min || max) && !measurement)
    throw new CatalogError(
      "Name the measurement you want to filter, such as screw-spacing.",
    );
  if (min && max && Number(min) > Number(max))
    throw new CatalogError(
      "The minimum measurement cannot exceed the maximum.",
    );
  return {
    q,
    mode: mode as SearchFilters["mode"],
    category,
    family,
    manufacturer,
    supplier,
    finish: value("finish", 80),
    measurement,
    min,
    max,
    unit: unit as "in" | "mm",
    page,
  };
}
export function classifyHit(hit: CatalogHit, q: string): CatalogHit["match"] {
  if (!q) return "browse";
  const numbers = [
    ...hit.numbers
      .filter((n) => n.verified_at && n.source_id)
      .map((n) => n.value),
    ...hit.offers.filter((n) => n.verified_at && n.source_id).map((n) => n.sku),
  ];
  if (numbers.some((n) => exactPartNumber(n) === exactPartNumber(q)))
    return "exact-identifier";
  if (
    normalizePartNumber(q) &&
    numbers.some((n) => normalizePartNumber(n) === normalizePartNumber(q))
  )
    return "normalized-candidate";
  return "possible-candidate";
}
/** Shared matching semantics for the private rehearsal and focused tests. Never a fit/compatibility decision. */
export function filterHits(
  hits: CatalogHit[],
  f: SearchFilters,
  privateRehearsal = false,
) {
  return hits
    .filter((h) => privateRehearsal || !h.synthetic)
    .map((h) => ({ ...h, match: classifyHit(h, f.q) }))
    .filter((h) => {
      const ids = [
        ...h.numbers.filter(n=>n.source_id&&n.verified_at).map((n) => n.value),
        ...h.offers.filter(n=>n.source_id&&n.verified_at).map((n) => n.sku),
      ];
      const norm = normalizePartNumber(f.q);
      const matches =
        !f.q ||
        (f.mode === "exact"
          ? h.match === "exact-identifier"
          : f.mode === "normalized"
            ? ["exact-identifier", "normalized-candidate"].includes(h.match!)
            : f.mode === "partial"
              ? norm.length >= 3 &&
                ids.some((n) => normalizePartNumber(n).includes(norm))
              : h.match !== "possible-candidate" ||
                (norm.length >= 3 &&
                  (ids.some((n) => normalizePartNumber(n).includes(norm)) ||
                    h.title.toLowerCase().includes(f.q.toLowerCase()))));
      return (
        matches &&
        (!f.category || h.category === f.category) &&
        (!f.family || h.family_id === f.family) &&
        (!f.manufacturer || h.manufacturer_id === f.manufacturer) &&
        (!f.supplier || h.offers.some((o) => o.supplier_id === f.supplier)) &&
        (!f.finish || h.finish.toLowerCase() === f.finish.toLowerCase()) &&
        (!f.measurement ||
          h.dimensions.some(
            (d) =>
              d.verified_at &&
              d.source_id &&
              d.key === f.measurement &&
              (!f.min ||
                dimensionMm(d.value, d.unit) >=
                  dimensionMm(Number(f.min), f.unit) - 1e-6) &&
              (!f.max ||
                dimensionMm(d.value, d.unit) <=
                  dimensionMm(Number(f.max), f.unit) + 1e-6),
          ))
      );
    })
    .sort(
      (a, b) =>
        [
          "exact-identifier",
          "normalized-candidate",
          "possible-candidate",
          "browse",
        ].indexOf(a.match!) -
        [
          "exact-identifier",
          "normalized-candidate",
          "possible-candidate",
          "browse",
        ].indexOf(b.match!),
    );
}
export function safeCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map(
          (value) =>
            '"' +
            (/^[\s]*[=+@\-]/.test(value) ? "'" : "") +
            value.replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}
