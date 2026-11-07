import type { HardwareCategory } from "./intake";

export interface LocalVideoThumbnail {
  src: `/images/${string}`;
  alt: string;
  width: number;
  height: number;
}
export type VideoSource =
  | { type: "youtube"; videoId: string }
  | {
      type: "mp4";
      src: `/${string}`;
      captions?: { src: `/${string}`; language: string; label: string };
    };
export interface VideoGuide {
  id: string;
  title: string;
  source: VideoSource;
  thumbnail: LocalVideoThumbnail;
  categories: readonly Exclude<HardwareCategory, "not-sure">[];
  creator: { name: string; url?: `https://${string}` };
  relatedGuides: readonly { title: string; href: `/guides${string}` }[];
}
export type HybridVideoPlayerProps = Pick<
  VideoGuide,
  "title" | "source" | "thumbnail"
>;
