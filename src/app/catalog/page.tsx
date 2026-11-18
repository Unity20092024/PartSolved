import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl, isPreviewDeployment } from "@/config/site";
import {
  catalogEnabled,
  catalogCollections,
  searchCatalog,
} from "@/lib/catalog/server";
import { searchFilters } from "@/lib/catalog/search";
import { CatalogError } from "@/lib/catalog/model";
import {
  CatalogFilters,
  CatalogResults,
} from "@/components/catalog/catalog-browser";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Replacement hardware catalog",
  description:
    "Search verified replacement-hardware records by manufacturer part number or supplier SKU.",
  alternates: { canonical: siteUrl("/catalog") },
  robots: { index: false, follow: true },
};
export default async function Catalog({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams,
    p = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === "string") p.set(key, value);
  });
  let error = "",
    filters = searchFilters(new URLSearchParams());
  try {
    filters = searchFilters(p);
  } catch (cause) {
    error =
      cause instanceof CatalogError
        ? cause.message
        : "Review the search filters.";
  }
  const [result, collections] = await Promise.all([
    searchCatalog(filters),
    catalogCollections(),
  ]);
  const pageHref = (page: number) => {
    const next = new URLSearchParams(p);
    next.set("page", String(page));
    return `/catalog?${next}`;
  };
  return (
    <>
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <span>Catalog</span>
      </nav>
      <header className="catalog-heading">
        <p className="catalog-eyebrow">The right details come first</p>
        <h1>Replacement hardware catalog</h1>
        <p>
          Look up a manufacturer’s part number or a supplier’s SKU. Keep fit and
          compatibility verification separate from the number search.
        </p>
      </header>
      {!catalogEnabled() && (
        <p className="catalog-notice">
          Verified supplier records are not available yet. Use Guided Finder to
          collect identification details while the catalog is being connected.
        </p>
      )}
      {error && (
        <p role="alert" className="catalog-notice">
          {error}
        </p>
      )}
      <CatalogFilters
        filters={filters}
        manufacturers={collections.manufacturers}
        suppliers={collections.suppliers}
      />
      <CatalogResults {...result} query={filters.q} />
      {result.total > 12 && (
        <nav className="catalog-pagination" aria-label="Catalog pages">
          {filters.page > 1 && (
            <Link href={pageHref(filters.page - 1)}>← Previous</Link>
          )}
          <span>Page {filters.page}</span>
          {result.total > filters.page * 12 && (
            <Link href={pageHref(filters.page + 1)}>Next →</Link>
          )}
        </nav>
      )}
      {isPreviewDeployment() && (
        <p className="catalog-note">This Preview is excluded from indexing.</p>
      )}
    </>
  );
}
