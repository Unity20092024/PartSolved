"use client";
import { useEffect, useState } from "react";
import { CatalogManager } from "./catalog-manager";
import { RehearsalCatalogPort } from "./rehearsal-port";
import {
  CatalogFilters,
  CatalogResults,
} from "@/components/catalog/catalog-browser";
import { ProductView } from "@/components/catalog/product-view";
import { searchFilters, filterHits } from "@/lib/catalog/search";
import {
  catalogFamilies,
  type CatalogCollections,
  type CatalogProduct,
  type CatalogHit,
} from "@/lib/catalog/model";
export function CatalogRehearsal({
  data,
}: {
  data: { products: CatalogProduct[]; collections: CatalogCollections };
}) {
  const [port] = useState(() => new RehearsalCatalogPort(data)),
    [view, setView] = useState("search"),
    [f, setFilters] = useState(() => searchFilters(new URLSearchParams())),
    [selected, setSelected] = useState<CatalogProduct | null>(null),
    [error, setError] = useState(""),
    [selectedVariant, setSelectedVariant] = useState("");
  useEffect(() => () => port.dispose(), [port]);
  const snapshot = port.snapshot();
  const hits: CatalogHit[] = port.allProducts().flatMap((p) =>
    p.variants.map((v) => ({
      product_id: p.id,
      variant_id: v.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      manufacturer_id: p.manufacturer_id,
      manufacturer_name: p.manufacturer_name || "",
      family_id: p.family_id,
      category:
        catalogFamilies.find((f) => f.id === p.family_id)?.category || "",
      finish: v.finish,
      verified_at: v.verified_at || "",
      synthetic: true,
      numbers: v.numbers,
      offers: v.offers,
      dimensions: v.dimensions,
      media: p.media,
    })),
  );
  const rows = filterHits(hits, f, true);
  return (
    <>
      <h1>Catalog foundation rehearsal</h1>
      <p className="catalog-notice">
        <strong>Protected Preview · Synthetic development data</strong>
        <br />
        Changes below exist only in this browser tab and disappear on refresh.
        Nothing here writes to Supabase, enters a public sitemap, becomes a real
        product or enables purchasing. Verification values are synthetic test
        data.
      </p>
      <div
        className="catalog-admin-tabs"
        role="group"
        aria-label="Rehearsal views"
      >
        <button
          aria-pressed={view === "search"}
          onClick={() => {
            setView("search");
            setSelected(null);
          }}
        >
          Search &amp; product preview
        </button>
        <button
          aria-pressed={view === "admin"}
          onClick={() => setView("admin")}
        >
          Catalog administration
        </button>
      </div>
      <section hidden={view !== "search"}>
        {selected ? (
          <>
            <button
              type="button"
              className="catalog-text-button"
              onClick={() => setSelected(null)}
            >
              ← Back to rehearsal search
            </button>
            <ProductView
              product={selected}
              initialVariant={selectedVariant}
              key={`${selected.id}:${selectedVariant}`}
              sources={snapshot.collections.sources}
            />
          </>
        ) : (
          <>
            <p>
              Try manufacturer number <strong>DEMO-MPN-001</strong>, normalized{" "}
              <strong>demompn001</strong>, or supplier SKU{" "}
              <strong>DEMO-B-001</strong>. These are synthetic examples only.
            </p>
            {error && <p role="alert">{error}</p>}
            <CatalogFilters
              key={JSON.stringify(f)}
              filters={f}
              manufacturers={snapshot.collections.manufacturers}
              suppliers={snapshot.collections.suppliers}
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  const values = new FormData(event.currentTarget),
                    params = new URLSearchParams();
                  values.forEach((value, key) => {
                    if (typeof value === "string") params.set(key, value);
                  });
                  setFilters(searchFilters(params));
                  setError("");
                } catch (error) {
                  setError(
                    error instanceof Error ? error.message : "Invalid filters.",
                  );
                }
              }}
            />
            <CatalogResults
              rows={rows}
              total={rows.length}
              query={f.q}
              onSelect={(id, variantId) => {
                setSelectedVariant(variantId);
                void port.load(id).then(setSelected);
              }}
            />
          </>
        )}
      </section>
      <section hidden={view !== "admin"}>
        <CatalogManager port={port} initial={snapshot} enabled rehearsal />
      </section>
    </>
  );
}
