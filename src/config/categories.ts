import type { Category } from "@/types/category";

// Presentation metadata, not inventory. Future catalog ingestion can map to these stable slugs.
export const categories: readonly Category[] = [
  {
    slug: "window-hardware",
    title: "Window Hardware",
    subtitle: "Locks • Latches • Operators",
    family: "windows",
    image: {
      src: "/images/window-sash-lock.webp",
      alt: "White window sash lock and keeper with countersunk mounting holes",
    },
    photoDescription: "Window lock / latch",
  },
  {
    slug: "door-hardware",
    title: "Door Hardware",
    subtitle: "Handles • Hinges • Locks",
    family: "doors",
    image: {
      src: "/images/residential-door-lockset.webp",
      alt: "Brushed-metal residential lever lockset with latch and keys",
    },
    photoDescription: "Door lever handle",
  },
  {
    slug: "window-parts",
    title: "Window Parts",
    subtitle: "Rollers • Balances • Sashes",
    family: "windows",
    image: {
      src: "/images/window-balance-assembly.webp",
      alt: "Two window balance spring assemblies with cream mounting ends and metal hooks",
    },
    photoDescription: "Window balance assembly",
  },
  {
    slug: "door-parts",
    title: "Door Parts",
    subtitle: "Hinges • Closers • Thresholds",
    family: "doors",
    image: {
      src: "/images/sliding-patio-door-roller.webp",
      alt: "Sliding patio door tandem roller assembly with metal housing and two wheels",
    },
    photoDescription: "Sliding patio door roller assembly",
  },
];
