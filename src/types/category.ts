export interface Category {
  slug: string;
  title: string;
  subtitle: string;
  family: "windows" | "doors";
  image: { src: string; alt: string } | null;
  photoDescription: string;
}
