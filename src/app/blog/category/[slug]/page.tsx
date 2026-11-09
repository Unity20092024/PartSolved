import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { publicCategories, listPublications } from "@/lib/blog/server";
import { siteUrl, isPreviewDeployment } from "@/config/site";
import { ArticleList } from "@/components/blog/article-list";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = (await publicCategories()).find((c) => c.slug === slug);
  if (!category) return {};
  const page = Math.max(
    1,
    Math.min(4000, Math.floor(Number((await searchParams).page) || 1)),
  );
  return {
    title: category.name,
    description:
      category.description || `Hardware advice about ${category.name}.`,
    alternates: {
      canonical: siteUrl(
        `/blog/category/${slug}${page > 1 ? `?page=${page}` : ""}`,
      ),
    },
    robots: { index: !isPreviewDeployment(), follow: true },
  };
}
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug } = await params,
    category = (await publicCategories()).find((c) => c.slug === slug);
  if (!category) notFound();
  const page = Math.max(
      1,
      Math.min(4000, Math.floor(Number((await searchParams).page) || 1)),
    ),
    { articles, count } = await listPublications(category.id, page);
  return (
    <main id="main-content" className="blog-shell">
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> /{" "}
        {category.name}
      </nav>
      <h1>{category.name}</h1>
      <p>{category.description}</p>
      <ArticleList articles={articles} />
      <nav className="blog-pagination" aria-label="Article pages">
        {page > 1 && (
          <Link href={`/blog/category/${slug}?page=${page - 1}`}>
            ← Previous
          </Link>
        )}
        {page * 12 < count && (
          <Link href={`/blog/category/${slug}?page=${page + 1}`}>Next →</Link>
        )}
      </nav>
    </main>
  );
}
