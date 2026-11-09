import type { MetadataRoute } from "next";
import { sitemapPublications, publicCategories } from "@/lib/blog/server";
import { canonicalFor } from "@/lib/blog/content";
import { siteUrl, isPreviewDeployment } from "@/config/site";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isPreviewDeployment()) return [];
  const paths = [
    "/",
    "/windows",
    "/doors",
    "/categories/window-hardware",
    "/categories/window-parts",
    "/categories/door-hardware",
    "/categories/door-parts",
    "/guides",
    "/guides/measurements",
    "/support",
  ];
  const [articles, categories] = await Promise.all([
    sitemapPublications(),
    publicCategories(),
  ]);
  const indexable = articles.filter(
    (p) => canonicalFor(p.document) === siteUrl(`/blog/${p.slug}`),
  );
  return [
    ...paths.map((path) => ({ url: siteUrl(path) })),
    ...(indexable.length ? [{ url: siteUrl("/blog") }] : []),
    ...categories
      .filter((c) => indexable.some((p) => p.category_id === c.id))
      .map((c) => ({ url: siteUrl(`/blog/category/${c.slug}`) })),
    ...indexable.map((p) => ({
      url: canonicalFor(p.document),
      lastModified: new Date(p.updated_at),
    })),
  ];
}
