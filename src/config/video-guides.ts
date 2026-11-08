import type { VideoGuide } from "@/types/video";

// Only the supplied tracker's EXACT MATCH candidates are included. Official
// YouTube oEmbed returned embed markup and creator credits on 2026-11-07.
// This does not guarantee playback in every region/browser or future availability.
// See docs/video-source-review.md; partial/title-only candidates remain unpublished.
export const videoGuides: readonly VideoGuide[] = [
  {
    id: "identify-window-balances",
    title:
      "How to Identify Window Balances | Spiral, Channel, Block & Tackle & Coil Balances",
    description:
      "An identification overview of balance families and markings. Use the written balance guide for measurement reference points and safe access; this video is not a verified compatibility assessment.",
    source: { type: "youtube", videoId: "_RZDEwhoZ84" },
    thumbnail: {
      src: "/images/video-thumbnails/window-balances.webp",
      alt: "Illustrative window balance spring assemblies, not a frame from the video",
      width: 960,
      height: 540,
      caption: "Hardware illustration, not a frame from the video.",
    },
    categories: ["window-parts"],
    creator: {
      name: "Equiparts",
      url: "https://www.youtube.com/@EquipartsNetSloan",
    },
    relatedGuides: [
      {
        title: "Measuring window balances",
        href: "/guides/measurements#window-balances",
      },
      {
        title: "Identifying balance end fittings",
        href: "/guides/measurements#balance-fittings",
      },
    ],
  },
  {
    id: "identify-hinge-types",
    title: "Every Type of Hinge Explained in 13 Minutes",
    description:
      "An overview of common hinge styles for initial identification. This is not a hinge measurement tutorial or a guarantee that a replacement will fit.",
    source: { type: "youtube", videoId: "O9k9gzlBgj4" },
    thumbnail: {
      src: "/images/video-thumbnails/door-hinges.webp",
      alt: "Illustrative metal door hinges in several finishes, not a frame from the video",
      width: 960,
      height: 540,
      caption: "Hardware illustration, not a frame from the video.",
    },
    categories: ["door-parts"],
    creator: {
      name: "Workshop Unpacked",
      url: "https://www.youtube.com/@WorkshopUnpacked",
    },
    relatedGuides: [
      {
        title: "Measuring overall length and width",
        href: "/guides/measurements#overall-size",
      },
      {
        title: "Identifying left/right orientation",
        href: "/guides/measurements#orientation",
      },
    ],
  },
];
