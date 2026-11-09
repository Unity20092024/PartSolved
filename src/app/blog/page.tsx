import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl, isPreviewDeployment } from "@/config/site";
import { listPublications, publicCategories } from "@/lib/blog/server";
import { ArticleList } from "@/components/blog/article-list";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}): Promise<Metadata> {
  const page = Math.max(
    1,
    Math.min(4000, Math.floor(Number((await searchParams).page) || 1)),
  );
  return {
    title: "Hardware advice & articles",
    description:
      "Practical window and door hardware advice, identification tips and measurement help from PartSolved.",
    alternates: {
      canonical: siteUrl(`/blog${page > 1 ? `?page=${page}` : ""}`),
    },
    robots: { index: !isPreviewDeployment(), follow: true },
  };
}
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = Math.max(
    1,
    Math.min(4000, Math.floor(Number((await searchParams).page) || 1)),
  );
  const [result, categories] = await Promise.all([
    listPublications(undefined, page),
    publicCategories(),
  ]);
  return (
    <main id="main-content" className="blog-shell">
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> / Blog
      </nav>
      <h1>Hardware advice, made practical.</h1>
      <p className="blog-lead">
        Understand the problem, learn what to measure, and take the next step
        toward identifying your hardware.
      </p>
      <nav className="blog-filters" aria-label="Article categories">
        <Link href="/blog">All articles</Link>
        {categories.map((c) => (
          <Link href={`/blog/category/${c.slug}`} key={c.id}>
            {c.name}
          </Link>
        ))}
      </nav>
      {result.unavailable ? (
        <p className="blog-notice">
          Articles are not available yet. You can still use our{" "}
          <Link href="/guides">identification guides</Link> and{" "}
          <Link href="/find-part/guided">Guided Finder</Link>.
        </p>
      ) : !result.articles.length ? (
        <p>
          No published articles here yet. Explore our{" "}
          <Link href="/guides">existing guides</Link> in the meantime.
        </p>
      ) : (
        <ArticleList articles={result.articles} />
      )}
      <nav className="blog-pagination" aria-label="Article pages">
        {page > 1 && <Link href={`/blog?page=${page - 1}`}>← Previous</Link>}
        {page * 12 < result.count && (
          <Link href={`/blog?page=${page + 1}`}>Next →</Link>
        )}
      </nav>
    </main>
  );
}
