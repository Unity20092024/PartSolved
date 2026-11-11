// Explicit local test data. This fixture is never a route or published content.
import { createRoot } from "react-dom/client";
import { ArticleEditor } from "@/components/admin/blog/article-editor";
import { SiteHeader } from "@/components/layout/site-header";
import type { Article, BlogCategory, BlogMedia } from "@/lib/blog/content";
declare global {
  interface Window {
    mountBlogEditor: (props: {
      article: Article;
      categories: BlogCategory[];
      media: BlogMedia[];
      enabled: boolean;
      scheduling: boolean;
    }) => void;
    lastBlogNavigation?: string;
  }
}
const root = createRoot(document.getElementById("blog-test-root")!);
window.mountBlogEditor = (props) =>
  root.render(
    <>
      <SiteHeader />
      <main className="blog-shell blog-admin">
        <ArticleEditor {...props} />
      </main>
    </>,
  );
window.addEventListener("blog-test-navigation", (event) => {
  window.lastBlogNavigation = (event as CustomEvent<string>).detail;
});
