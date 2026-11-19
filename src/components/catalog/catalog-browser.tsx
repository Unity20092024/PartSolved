import Image from "next/image";
import Link from "next/link";
import {
  catalogCategories,
  catalogFamilies,
  type CatalogEntity,
  type CatalogHit,
} from "@/lib/catalog/model";
import type { SearchFilters } from "@/lib/catalog/search";
export function CatalogFilters({
  filters: f,
  manufacturers,
  suppliers,
  action = "/catalog",
  onSubmit,
}: {
  filters: SearchFilters;
  manufacturers: CatalogEntity[];
  suppliers: CatalogEntity[];
  action?: string;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form
      className="catalog-filters"
      action={action}
      method="get"
      onSubmit={onSubmit}
    >
      <div className="catalog-search-line">
        <label>
          Part number or supplier SKU
          <input
            type="search"
            name="q"
            defaultValue={f.q}
            maxLength={80}
            placeholder="Enter the number printed on your part"
          />
        </label>
        <button className="catalog-button" type="submit">
          Search catalog
        </button>
      </div>
      <div className="catalog-filter-grid">
        <label>
          Category
          <select name="category" defaultValue={f.category}>
            <option value="">All categories</option>
            {catalogCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Hardware family
          <select name="family" defaultValue={f.family}>
            <option value="">All families</option>
            {catalogFamilies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <details>
        <summary>Number lookup, manufacturer &amp; measurements</summary>
        <div className="catalog-filter-grid">
          <label>
            Lookup method
            <select name="mode" defaultValue={f.mode}>
              <option value="all">
                Exact numbers, then possible candidates
              </option>
              <option value="exact">Exact recorded number only</option>
              <option value="normalized">Ignore punctuation and spacing</option>
              <option value="partial">
                Partial number (at least 3 characters)
              </option>
            </select>
          </label>
          <label>
            Manufacturer
            <select name="manufacturer" defaultValue={f.manufacturer}>
              <option value="">Any manufacturer</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Supplier
            <select name="supplier" defaultValue={f.supplier}>
              <option value="">Any supplier</option>
              {suppliers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Verified finish
            <input
              name="finish"
              defaultValue={f.finish}
              maxLength={80}
              placeholder="Leave blank if unknown"
            />
          </label>
          <label>
            Measurement key
            <input
              name="measurement"
              defaultValue={f.measurement}
              maxLength={80}
              placeholder="e.g. screw-spacing"
            />
            <small>Use the measurement name recorded in the catalog.</small>
          </label>
          <label>
            Units
            <select name="unit" defaultValue={f.unit}>
              <option value="mm">Millimeters</option>
              <option value="in">Inches</option>
            </select>
          </label>
          <label>
            Minimum
            <input
              type="number"
              inputMode="decimal"
              name="min"
              defaultValue={f.min}
              min="0.000001"
              step="any"
            />
          </label>
          <label>
            Maximum
            <input
              type="number"
              inputMode="decimal"
              name="max"
              defaultValue={f.max}
              min="0.000001"
              step="any"
            />
          </label>
        </div>
        <button type="submit" className="catalog-button catalog-secondary">
          Apply filters
        </button>
      </details>
    </form>
  );
}
const matchLabels = {
  "exact-identifier": "Exact verified number",
  "normalized-candidate": "Normalized number candidate",
  "possible-candidate": "Possible candidate",
  browse: "Catalog record",
};
export function CatalogResults({
  rows,
  total,
  configured = true,
  onSelect,
  query = "",
}: {
  rows: CatalogHit[];
  total: number;
  configured?: boolean;
  onSelect?: (id: string, variantId: string) => void;
  query?: string;
}) {
  const exact = rows.some((row) => row.match === "exact-identifier");
  return (
    <section
      aria-labelledby="catalog-results-title"
      className="catalog-results"
    >
      <div className="catalog-results-heading">
        <h2 id="catalog-results-title">
          {!rows.length
            ? "No verified match"
            : query
              ? exact
                ? "Recorded number matches"
                : "Possible candidates"
              : "Browse verified records"}
        </h2>
        <span>
          {total} {total === 1 ? "variant" : "variants"}
        </span>
      </div>
      {!rows.length ? (
        <div className="catalog-empty">
          <h3>Let’s keep narrowing it down.</h3>
          <p>
            {configured
              ? "No published, verified catalog record meets these filters. Try fewer filters or use Guided Finder to collect more details."
              : "Live supplier records are not connected to this search yet. Guided Finder can help you record identification details."}
          </p>
          <Link href="/find-part/guided" className="catalog-button">
            Use Guided Finder
          </Link>{" "}
          <Link href="/guides/measurements">Measurement help</Link>
        </div>
      ) : (
        <>
          <p className="catalog-note">
            A number match identifies a catalog record. Similar appearance,
            punctuation or dimensions do not confirm replacement compatibility.
          </p>
          <div className="catalog-card-grid">
            {rows.map((row) => {
              const image = row.media.find(
                  (m) => m.permission === "approved" && m.state === "ready",
                ),
                href = `/catalog/${row.slug}?variant=${row.variant_id}`;
              return (
                <article className="catalog-product-card" key={row.variant_id}>
                  {image ? (
                    <div className="catalog-card-photo">
                      <Image
                        src={
                          /^(data:|blob:)/.test(image.path)
                            ? image.path
                            : `/api/catalog/media/${image.id}`
                        }
                        width={image.width}
                        height={image.height}
                        alt={image.alt}
                        unoptimized
                      />
                    </div>
                  ) : (
                    <div className="catalog-no-image">
                      No authorized product photo
                    </div>
                  )}
                  {row.synthetic && (
                    <p className="catalog-fixture">
                      Synthetic rehearsal record
                    </p>
                  )}
                  <p className="catalog-match-label">
                    {matchLabels[row.match || "browse"]}
                  </p>
                  <p className="catalog-eyebrow">
                    {row.manufacturer_name || "Manufacturer not recorded"}
                  </p>
                  <h3>{row.title}</h3>
                  <p>
                    {catalogFamilies.find((f) => f.id === row.family_id)?.name}
                  </p>
                  <dl>
                    <dt>Manufacturer number</dt>
                    <dd>
                      {row.numbers
                        .filter((n) => n.kind === "manufacturer")
                        .map((n) => n.value)
                        .join(", ") || "Not recorded"}
                    </dd>
                    <dt>Supplier SKU</dt>
                    <dd>
                      {row.offers
                        .map(
                          (o) => `${o.supplier_name || "Supplier"}: ${o.sku}`,
                        )
                        .join(" · ") || "Not recorded"}
                    </dd>
                  </dl>
                  {onSelect ? (
                    <button
                      type="button"
                      className="catalog-text-button"
                      onClick={() => onSelect(row.product_id, row.variant_id)}
                    >
                      View record →
                    </button>
                  ) : (
                    <Link href={href} className="catalog-text-button">
                      View specifications →
                    </Link>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
