import type { Metadata } from "next";
import { siteUrl, isPreviewDeployment } from "@/config/site";
import {
  listPublications,
  publicCategories,
  featuredPublication,
} from "@/lib/blog/server";
import { ArticleList } from "@/components/blog/article-list";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogLanding } from "@/components/blog/blog-landing";
import { BlogImage } from "@/components/blog/blog-image";
import { articleCategoryLabel } from "@/lib/blog/presentation";
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
  const [result, categories, featured] = await Promise.all([
    listPublications(undefined, page),
    publicCategories(),
    page === 1 ? featuredPublication() : Promise.resolve(null),
  ]);
  const grid = result.articles.filter(
    (article) => article.post_id !== featured?.post_id,
  );
  return (
    <BlogLanding
      categories={categories}
      cards={<ArticleList articles={grid} categories={categories} />}
      featuredCard={
        featured ? (
          <ArticleCard
            article={featured}
            categoryLabel={articleCategoryLabel(featured.document, categories)}
            featured
            image={
              featured.document.featured_image_id ? (
                <BlogImage
                  id={featured.document.featured_image_id}
                  alt={featured.document.featured_alt}
                />
              ) : undefined
            }
          />
        ) : undefined
      }
      unavailable={result.unavailable}
      hasArticles={result.articles.length > 0}
      page={page}
      total={result.count}
    />
  );
}
