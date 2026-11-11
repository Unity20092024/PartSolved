// Development-only visual specimens. No application route imports these records.
import { createRoot } from "react-dom/client";
import Image from "next/image";
import { SiteHeader } from "@/components/layout/site-header";
import { BlogLanding } from "@/components/blog/blog-landing";
import { ArticleCard } from "@/components/blog/article-card";
import { emptyArticle, type Publication } from "@/lib/blog/content";
const categories = [
  "Window Hardware",
  "Patio Door Hardware",
  "Measuring & Identification",
].map((name, index) => ({
  id: `fixture-${index}`,
  name,
  slug: `fixture-${index}`,
  description: "Development fixture only",
}));
const photos = [
  "/images/window-balance-assembly.webp",
  "/images/sliding-patio-door-roller.webp",
  "/images/window-sash-measurement.webp",
];
const articles: Publication[] = categories.map((category, index) => ({
  post_id: category.id,
  category_id: category.id,
  slug: `layout-fixture-${index}`,
  published_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  media_ids: [],
  document: {
    ...emptyArticle(`layout-fixture-${index}`),
    category_id: category.id,
    title: [
      "Layout example: understanding window balances",
      "Layout example: when a patio door is hard to slide",
      "Layout example: what to measure before you order",
    ][index],
    excerpt:
      "Unpublished layout example. Clear photographs and a few careful measurements can help you describe your hardware and decide what to check next.",
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: Array(440).fill("word").join(" ") }],
        },
      ],
    },
  },
}));
const card = (article: Publication, index: number) => (
  <ArticleCard
    key={article.post_id}
    article={article}
    categoryLabel={categories[index].name}
    image={
      <Image
        src={photos[index]}
        width={960}
        height={640}
        alt={`Development layout image: ${categories[index].name}`}
      />
    }
  />
);
createRoot(document.getElementById("blog-layout-root")!).render(
  <>
    <SiteHeader />
    <p
      role="note"
      style={{
        margin: 0,
        padding: "12px 20px",
        background: "#fff4d4",
        color: "#4a3908",
        textAlign: "center",
      }}
    >
      Development-only card layout · These are not published articles.
    </p>
    <BlogLanding
      categories={categories}
      cards={<div className="blog-grid">{articles.map(card)}</div>}
      unavailable={false}
      hasArticles
      page={1}
      total={3}
    />
  </>,
);
