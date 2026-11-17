/* eslint-disable @next/next/no-head-element, @next/next/no-css-tags -- standalone local server-rendering test document */
// Pure server rendering of the real article template. No route, published fixture or database write.
import { renderToStaticMarkup } from "react-dom/server";
import { ArticleView } from "@/components/blog/article-view";
import { SiteHeader } from "@/components/layout/site-header";
import type { ArticleDocument } from "@/lib/blog/content";
export function readerHtml(document: ArticleDocument) {
  return (
    "<!doctype html>" +
    renderToStaticMarkup(
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="robots" content="noindex,nofollow" />
          <link rel="stylesheet" href="/__editorial.css" />
          <title>Private editorial design review</title>
        </head>
        <body>
          <SiteHeader />
          <main className="blog-shell blog-reading">
            <ArticleView
              document={document}
              updatedAt="2026-11-16T12:00:00Z"
              preview
            />
          </main>
        </body>
      </html>,
    )
  );
}
