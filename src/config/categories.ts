import type { Category } from "@/types/category";

// Presentation metadata, not inventory. Future catalog ingestion can map to these stable slugs.
export const categories: readonly Category[] = [
  {
    slug: "window-hardware",
    title: "Window Hardware",
    subtitle: "Locks • Latches • Operators",
    family: "windows",
    image: null,
    photoDescription: "Window lock / latch",
  },
  {
    slug: "door-hardware",
    title: "Door Hardware",
    subtitle: "Handles • Hinges • Locks",
    family: "doors",
    image: null,
    photoDescription: "Door lever handle",
  },
  {
    slug: "window-parts",
    title: "Window Parts",
    subtitle: "Rollers • Balances • Sashes",
    family: "windows",
    image: null,
    photoDescription: "Window roller assembly",
  },
  {
    slug: "door-parts",
    title: "Door Parts",
    subtitle: "Hinges • Closers • Thresholds",
    family: "doors",
    image: null,
    photoDescription: "Door hinge",
  },
];
