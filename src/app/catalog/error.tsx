"use client";
import Link from "next/link";
export default function CatalogErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="catalog-empty">
      <h1>The catalog is temporarily unavailable</h1>
      <p>
        We could not load verified catalog records. Try again, or continue
        collecting identification details with Guided Finder.
      </p>
      <div className="catalog-actions">
        <button className="catalog-button" type="button" onClick={reset}>
          Try catalog again
        </button>
        <Link href="/find-part/guided">Open Guided Finder</Link>
      </div>
    </section>
  );
}
