"use client";
import Link from "next/link";
import { usePhoto } from "./photo-provider";
export function CatalogSearchEntry() {
  const { setDraft } = usePhoto();
  return (
    <section
      className="intake-card finder-catalog-entry"
      aria-labelledby="catalog-search-title"
    >
      <h2 id="catalog-search-title">Look for catalog candidates</h2>
      <p>
        Search published catalog records using your written details. Your photo
        stays in this tab and is not sent or analyzed for this search.
      </p>
      <Link
        className="button button-primary"
        href="/find-part/results"
        onClick={() =>
          setDraft((d) => ({ ...d, catalogSearchRequested: true }))
        }
      >
        Search Catalog
      </Link>
      <p className="field-hint">
        Measurements are optional. A matching number or category does not
        guarantee fit. You can also continue with the guides below.
      </p>
    </section>
  );
}
