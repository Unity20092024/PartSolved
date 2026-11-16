import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock3 } from "lucide-react";
import {
  guideTopics,
  plainText,
  type ArticleDocument,
  type Publication,
  type RichNode,
} from "@/lib/blog/content";
import { normalizeImportedBody } from "@/lib/blog/import-format";
import { estimatedReadingMinutes } from "@/lib/blog/presentation";
import { BlogImage } from "./blog-image";
import { RichContent } from "./rich-content";
import { ArticleList } from "./article-list";
function headings(body: RichNode) {
  const result: { id: string; text: string; level: number }[] = [];
  const walk = (node: RichNode) => {
    if (node.type === "heading")
      result.push({
        id: `article-section-${result.length + 1}`,
        text: plainText(node),
        level: Number(node.attrs?.level) || 2,
      });
    node.content?.forEach(walk);
  };
  walk(body);
  return result;
}
const date = (value: string) =>
  new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
export function ArticleView({
  document: source,
  publishedAt,
  updatedAt,
  preview = false,
  related = [],
}: {
  document: ArticleDocument;
  publishedAt?: string | null;
  updatedAt?: string;
  preview?: boolean;
  related?: Publication[];
}) {
  const doc = { ...source, body: normalizeImportedBody(source.body) },
    contents = headings(doc.body),
    minutes = estimatedReadingMinutes(doc);
  const initials = doc.author
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (
    <article className="reader-article">
      <nav className="article-breadcrumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href="/blog">Journal</Link>
        <span>/</span>
        <span>Article</span>
      </nav>
      {preview && (
        <p className="article-preview-note">
          Private design preview · Not approved for public release
        </p>
      )}
      <header className="article-masthead">
        <p className="article-kicker">The PartSolved Journal</p>
        <h1>{doc.title || "Untitled draft"}</h1>
        <p className="article-deck">{doc.excerpt}</p>
        <div className="article-byline">
          {doc.author && (
            <div className="article-author">
              <span className="article-author-initials" aria-hidden="true">
                {initials}
              </span>
              <span>
                <small>Written by</small>
                <strong>{doc.author}</strong>
              </span>
            </div>
          )}
          <div className="article-dates">
            {publishedAt && (
              <span>
                <CalendarDays size={15} aria-hidden="true" /> Published{" "}
                <time dateTime={publishedAt}>{date(publishedAt)}</time>
              </span>
            )}
            {updatedAt && (
              <span>
                Updated <time dateTime={updatedAt}>{date(updatedAt)}</time>
              </span>
            )}
            {minutes !== null && (
              <span>
                <Clock3 size={15} aria-hidden="true" /> About {minutes} min read
              </span>
            )}
          </div>
        </div>
      </header>
      {doc.featured_image_id && (
        <figure className="article-hero">
          <BlogImage
            className="blog-featured"
            id={doc.featured_image_id}
            alt={doc.featured_alt}
            preview={preview}
          />
        </figure>
      )}
      <div className="article-reading-grid">
        <div className="article-main-copy">
          <RichContent body={doc.body} preview={preview} />
        </div>
        {contents.length > 0 && (
          <aside className="article-contents">
            <details>
              <summary>In this article</summary>
              <nav aria-label="Article contents">
                {contents.map((item) => (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    className={
                      item.level === 3
                        ? "article-contents-subheading"
                        : undefined
                    }
                  >
                    {item.text}
                  </a>
                ))}
              </nav>
            </details>
          </aside>
        )}
      </div>
      <footer className="article-footer">
        {doc.related_guides.length > 0 && (
          <section className="article-guide-links">
            <h2>Measure with confidence</h2>
            <p>
              Use the measurements and identification guidance relevant to your
              part.
            </p>
            <ul>
              {doc.related_guides.map((id) => (
                <li key={id}>
                  <Link href={`/guides/measurements#${id}`}>
                    {guideTopics[id as keyof typeof guideTopics]}{" "}
                    <ArrowUpRight size={15} aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="article-related" aria-label="Related reading">
          <p className="article-kicker">Keep learning</p>
          <h2>Related articles &amp; practical help</h2>
          {related.length > 0 ? (
            <ArticleList articles={related} />
          ) : (
            <p>
              Explore our <Link href="/guides">identification guides</Link> and{" "}
              <Link href="/guides/measurements">measurement tips</Link> while
              the article library grows.
            </p>
          )}
        </section>
        <div className="article-finder-link">
          <div>
            <h3>Not sure what your part is called?</h3>
            <p>Start with a few everyday questions. No part number required.</p>
          </div>
          <Link href="/find-part/guided">
            Open Guided Finder <ArrowUpRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </footer>
    </article>
  );
}
