import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { ReactNode } from "react";
import type { BlogCategory } from "@/lib/blog/content";
import { BlogHero } from "./blog-hero";
export function BlogLanding({
  categories,
  cards,
  featuredCard,
  unavailable,
  hasArticles,
  page,
  total,
}: {
  categories: BlogCategory[];
  cards: ReactNode;
  featuredCard?: ReactNode;
  unavailable: boolean;
  hasArticles: boolean;
  page: number;
  total: number;
}) {
  return (
    <main id="main-content" className="blog-index">
      <BlogHero />
      <div className="blog-shell blog-index-content">
        <nav aria-label="Breadcrumb" className="blog-breadcrumb">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Blog</span>
        </nav>
        <div className="blog-section-heading">
          <div>
            <p className="blog-eyebrow">A little know-how goes a long way</p>
            <h2>All Articles</h2>
          </div>
          <p>Practical help for the hardware in your home.</p>
        </div>
        <nav className="blog-filters" aria-label="Article categories">
          <Link href="/blog" aria-current="page">
            All Articles
          </Link>
          {categories.map((category) => (
            <Link href={`/blog/category/${category.slug}`} key={category.id}>
              {category.name}
            </Link>
          ))}
        </nav>
        {featuredCard && (
          <section
            aria-label="Featured article"
            className="blog-featured-section"
          >
            <p className="blog-eyebrow">Featured article</p>
            {featuredCard}
          </section>
        )}
        {unavailable || !hasArticles ? (
          <section className="blog-empty" aria-labelledby="blog-empty-heading">
            <span className="blog-empty-icon">
              <BookOpen size={28} aria-hidden="true" />
            </span>
            <div>
              <h3 id="blog-empty-heading">
                {unavailable
                  ? "Our article library is getting ready."
                  : "Good advice is on the way."}
              </h3>
              <p>
                {unavailable
                  ? "Published articles are not available yet."
                  : "No articles have been published here yet."}{" "}
                In the meantime, our existing guides can help you identify and
                measure your hardware.
              </p>
              <div className="blog-empty-actions">
                <Link className="button button-primary" href="/guides">
                  Explore Guides <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <Link
                  className="button button-secondary"
                  href="/find-part/guided"
                >
                  Start Guided Finder
                </Link>
              </div>
            </div>
          </section>
        ) : (
          cards
        )}
        {hasArticles && (
          <p className="blog-reading-note">
            Reading times are estimates based on each article’s text.
          </p>
        )}
        <nav className="blog-pagination" aria-label="Article pages">
          {page > 1 && <Link href={`/blog?page=${page - 1}`}>← Previous</Link>}
          {page * 12 < total && (
            <Link href={`/blog?page=${page + 1}`}>Next →</Link>
          )}
        </nav>
      </div>
    </main>
  );
}
