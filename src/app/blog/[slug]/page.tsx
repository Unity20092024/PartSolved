import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import {
  getPublication,
  listPublications,
  publicCategories,
} from "@/lib/blog/server";
import { canonicalFor, jsonLd, mediaUrl } from "@/lib/blog/content";
import { siteUrl, isPreviewDeployment } from "@/config/site";
import { ArticleView } from "@/components/blog/article-view";
import { ArticleList } from "@/components/blog/article-list";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const found = await getPublication((await params).slug);
  if (!found) return { robots: { index: false } };
  const { document: doc, published_at, updated_at } = found.article,
    image = doc.social_image_id || doc.featured_image_id;
  return {
    title: doc.seo_title || doc.title,
    description: doc.meta_description || doc.excerpt,
    alternates: { canonical: canonicalFor(doc) },
    robots: { index: !isPreviewDeployment(), follow: true },
    openGraph: {
      type: "article",
      title: doc.seo_title || doc.title,
      description: doc.meta_description || doc.excerpt,
      url: canonicalFor(doc),
      publishedTime: published_at,
      modifiedTime: updated_at,
      authors: [doc.author],
      images: image
        ? [
            {
              url: siteUrl(mediaUrl(image)),
              alt: doc.social_image_id ? doc.social_alt : doc.featured_alt,
            },
          ]
        : [],
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: doc.seo_title || doc.title,
      description: doc.meta_description || doc.excerpt,
      images: image ? [siteUrl(mediaUrl(image))] : [],
    },
  };
}
export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const found = await getPublication((await params).slug);
  if (!found) notFound();
  const { article, redirect } = found;
  if (redirect) permanentRedirect(`/blog/${article.slug}`);
  const doc = article.document;
  const categories = await publicCategories();
  const related = (
    await listPublications(article.category_id || undefined)
  ).articles
    .filter((p) => p.post_id !== article.post_id)
    .slice(0, 3);
  const structured = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: doc.title,
      description: doc.excerpt,
      author: { "@type": "Person", name: doc.author },
      datePublished: article.published_at,
      dateModified: article.updated_at,
      mainEntityOfPage: canonicalFor(doc),
      ...(doc.featured_image_id
        ? { image: siteUrl(mediaUrl(doc.featured_image_id)) }
        : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl("/") },
        {
          "@type": "ListItem",
          position: 2,
          name: "Blog",
          item: siteUrl("/blog"),
        },
        {
          "@type": "ListItem",
          position: 3,
          name: doc.title,
          item: canonicalFor(doc),
        },
      ],
    },
  ];
  return (
    <main id="main-content" className="blog-shell blog-reading">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structured) }}
      />
      <ArticleView
        document={doc}
        publishedAt={article.published_at}
        updatedAt={article.updated_at}
      />
      {related.length > 0 && (
        <section>
          <h2>Related articles</h2>
          <ArticleList articles={related} categories={categories} />
        </section>
      )}
      <p>
        <Link href="/blog">← All articles</Link>
      </p>
    </main>
  );
}
