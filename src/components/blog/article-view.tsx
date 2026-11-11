import Link from "next/link";
import { guideTopics, type ArticleDocument } from "@/lib/blog/content";
import { BlogImage } from "./blog-image";
import { RichContent } from "./rich-content";
export function ArticleView({
  document: doc,
  publishedAt,
  updatedAt,
  preview = false,
}: {
  document: ArticleDocument;
  publishedAt?: string | null;
  updatedAt?: string;
  preview?: boolean;
}) {
  return (
    <article>
      <nav aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> /{" "}
        <span>{doc.title || "Untitled draft"}</span>
      </nav>
      {preview && (
        <p className="blog-notice">
          Private working-draft preview. This is not the published article.
        </p>
      )}
      <header className="blog-article-header">
        <h1>{doc.title || "Untitled draft"}</h1>
        <p className="blog-lead">{doc.excerpt}</p>
        <p>
          {doc.author && <>By {doc.author} · </>}
          {publishedAt && (
            <>
              Published{" "}
              <time dateTime={publishedAt}>
                {new Date(publishedAt).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </time>
            </>
          )}
          {updatedAt && (
            <>
              {" "}
              · Updated{" "}
              <time dateTime={updatedAt}>
                {new Date(updatedAt).toLocaleDateString("en-US", {
                  timeZone: "UTC",
                })}
              </time>
            </>
          )}
        </p>
      </header>
      {doc.featured_image_id && (
        <BlogImage
          className="blog-featured"
          id={doc.featured_image_id}
          alt={doc.featured_alt}
          preview={preview}
        />
      )}
      <RichContent body={doc.body} preview={preview} />
      {doc.related_guides.length > 0 && (
        <aside className="blog-panel">
          <h2>Related measurement help</h2>
          <ul>
            {doc.related_guides.map((id) => (
              <li key={id}>
                <Link href={`/guides/measurements#${id}`}>
                  {guideTopics[id as keyof typeof guideTopics]}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
      <aside className="blog-panel">
        <h2>Need help identifying your hardware?</h2>
        <p>
          Use everyday questions and photos to narrow down possible hardware
          families. Confirm measurements and compatibility before ordering.
        </p>
        <Link className="button button-primary" href="/find-part/guided">
          Start Guided Finder
        </Link>
        {[
          "window-hardware",
          "window-parts",
          "door-hardware",
          "door-parts",
        ].includes(doc.hardware_category) && (
          <p>
            <Link href={`/categories/${doc.hardware_category}`}>
              Browse the related hardware category
            </Link>
          </p>
        )}
      </aside>
    </article>
  );
}
