import Link from "next/link";
import { categories } from "@/config/categories";
import { HybridVideoPlayer } from "./hybrid-video-player";
import type { VideoGuide } from "@/types/video";
import "./video-guides.css";

export function VideoGuideLibrary({
  videos,
}: {
  videos: readonly VideoGuide[];
}) {
  return (
    <section
      className="video-guide-library"
      aria-labelledby="video-guides-heading"
    >
      <h2 id="video-guides-heading">Video guides</h2>
      {videos.length === 0 ? (
        <div className="intake-card">
          <p>
            No video tutorials are published yet. You can use the written
            identification and measurement guides now.
          </p>
          <Link className="measurement-help" href="/guides/measurements">
            View measurement and identification help
          </Link>
        </div>
      ) : (
        <div className="video-guide-grid">
          {videos.map((guide) => (
            <article key={guide.id} className="intake-card video-guide-card">
              <h3>{guide.title}</h3>
              <p className="video-guide-categories">
                {guide.categories
                  .map(
                    (slug) =>
                      categories.find((category) => category.slug === slug)
                        ?.title,
                  )
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              <HybridVideoPlayer
                title={guide.title}
                source={guide.source}
                thumbnail={guide.thumbnail}
              />
              <p>
                Video by{" "}
                {guide.creator.url ? (
                  <a
                    href={guide.creator.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {guide.creator.name}
                    <span className="sr-only"> (opens a new tab)</span>
                  </a>
                ) : (
                  guide.creator.name
                )}
              </p>
              {guide.relatedGuides.length > 0 && (
                <div>
                  <h4>Related written guides</h4>
                  <ul>
                    {guide.relatedGuides.map((related) => (
                      <li key={related.href}>
                        <Link href={related.href}>{related.title}</Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
