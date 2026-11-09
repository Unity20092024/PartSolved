import { type Publication, type BlogCategory } from "@/lib/blog/content";
import { articleCategoryLabel } from "@/lib/blog/presentation";
import { BlogImage } from "./blog-image";
import { ArticleCard } from "./article-card";
export function ArticleList({
  articles,
  categories = [],
}: {
  articles: Publication[];
  categories?: BlogCategory[];
}) {
  return (
    <div className="blog-grid">
      {articles.map((article) => (
        <ArticleCard
          key={article.post_id}
          article={article}
          categoryLabel={articleCategoryLabel(article.document, categories)}
          image={
            article.document.featured_image_id ? (
              <BlogImage
                id={article.document.featured_image_id}
                alt={article.document.featured_alt}
              />
            ) : undefined
          }
        />
      ))}
    </div>
  );
}
