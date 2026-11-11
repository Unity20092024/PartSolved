import { categories as hardwareCategories } from "@/config/categories";
import { wordCount, type ArticleDocument, type BlogCategory } from "./content";
export function estimatedReadingMinutes(
  document: ArticleDocument,
): number | null {
  const words = wordCount(document.body);
  return words ? Math.max(1, Math.ceil(words / 220)) : null;
}
export function articleCategoryLabel(
  document: ArticleDocument,
  categories: BlogCategory[] = [],
) {
  return (
    categories.find((category) => category.id === document.category_id)?.name ||
    hardwareCategories.find(
      (category) => category.slug === document.hardware_category,
    )?.title ||
    "Hardware advice"
  );
}
export function titleSlug(title: string) {
  return title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 100)
    .replace(/^-|-$/g, "");
}
