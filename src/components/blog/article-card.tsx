import Link from "next/link";
import { ArrowUpRight, Clock3 } from "lucide-react";
import type { ReactNode } from "react";
import type { Publication } from "@/lib/blog/content";
import { estimatedReadingMinutes } from "@/lib/blog/presentation";
export function ArticleCard({
  article,
  categoryLabel,
  image,
  featured = false,
}: {
  article: Publication;
  categoryLabel: string;
  image?: ReactNode;
  featured?: boolean;
}) {
  const { document: doc, published_at } = article,
    minutes = estimatedReadingMinutes(doc);
  return (
    <article className={`blog-card${featured ? " blog-card-highlight" : ""}`}>
      {image && <div className="blog-card-media">{image}</div>}
      <div className="blog-card-content">
        <p className="blog-card-category">{categoryLabel}</p>
        <h3>
          <Link href={`/blog/${doc.slug}`}>{doc.title}</Link>
        </h3>
        <p className="blog-card-excerpt">{doc.excerpt}</p>
        <div className="blog-card-meta">
          {minutes !== null && (
            <span
              aria-label={`Estimated reading time: ${minutes} minute${minutes === 1 ? "" : "s"}`}
            >
              <Clock3 size={15} aria-hidden="true" />~{minutes} min read
            </span>
          )}
          <time dateTime={published_at}>
            {new Date(published_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </div>
        <Link
          className="blog-read-link"
          href={`/blog/${doc.slug}`}
          aria-label={`Read article: ${doc.title}`}
        >
          Read Article{" "}
          <span aria-hidden="true">
            <ArrowUpRight size={21} />
          </span>
        </Link>
      </div>
    </article>
  );
}
