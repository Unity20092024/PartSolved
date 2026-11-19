import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicCatalogProduct, catalogCollections } from "@/lib/catalog/server";
import { siteUrl, isPreviewDeployment } from "@/config/site";
import { FinderReturn } from "@/components/catalog/finder-return";
import { ProductView } from "@/components/catalog/product-view";
import { jsonLd } from "@/lib/blog/content";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const p = await publicCatalogProduct((await params).slug);
  if (!p) return { robots: { index: false } };
  return {
    title: p.title,
    description:
      p.description.slice(0, 160) ||
      `Verified catalog information for ${p.title}.`,
    alternates: { canonical: siteUrl(`/catalog/${p.slug}`) },
    robots: { index: !isPreviewDeployment(), follow: true },
    openGraph: {
      title: p.title,
      description: p.description.slice(0, 160),
      url: siteUrl(`/catalog/${p.slug}`),
    },
  };
}
export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ variant?: string }>;
}) {
  const p = await publicCatalogProduct((await params).slug);
  if (!p) notFound();
  const [collections, query] = await Promise.all([
    catalogCollections(),
    searchParams,
  ]);
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    description: p.description,
    url: siteUrl(`/catalog/${p.slug}`),
    ...(p.manufacturer_name
      ? { manufacturer: { "@type": "Organization", name: p.manufacturer_name } }
      : {}),
  };
  return (
    <>
      <nav className="catalog-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/catalog">Catalog</Link>
        <span>/</span>
        <span>Product</span>
      </nav>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structured) }}
      />
      <FinderReturn />
      <ProductView
        key={`${p.id}:${query.variant || ""}`}
        product={p}
        sources={collections.sources}
        initialVariant={query.variant}
      />
    </>
  );
}
