import Link from "next/link";
import { type Publication } from "@/lib/blog/content";
import { BlogImage } from "./blog-image";
export function ArticleList({ articles }: { articles: Publication[] }) {
  return (
    <div className="blog-grid">
      {articles.map(({ post_id, document: doc, published_at }) => (
        <article key={post_id} className="blog-card">
          {doc.featured_image_id && (
            <Link href={`/blog/${doc.slug}`} tabIndex={-1} aria-hidden="true">
              <BlogImage id={doc.featured_image_id} alt="" />
            </Link>
          )}
          <div>
            <p className="blog-muted">
              <time dateTime={published_at}>
                {new Date(published_at).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </time>
            </p>
            <h2>
              <Link href={`/blog/${doc.slug}`}>{doc.title}</Link>
            </h2>
            <p>{doc.excerpt}</p>
            <Link href={`/blog/${doc.slug}`}>Read article →</Link>
          </div>
        </article>
      ))}
    </div>
  );
}
