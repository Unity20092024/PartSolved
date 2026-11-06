import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { categories } from "@/config/categories";
import type { Category } from "@/types/category";
import { PhotographySlot } from "@/components/ui/photography-slot";

export function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="category-card"
      aria-label={category.title}
    >
      <div className="category-image">
        {category.image ? (
          <Image
            src={category.image.src}
            alt={category.image.alt}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 540px) 50vw, 100vw"
          />
        ) : (
          <PhotographySlot description={category.photoDescription} />
        )}
      </div>
      <div className="category-caption">
        <h3>{category.title}</h3>
        <p>{category.subtitle}</p>
        <span className="category-arrow" aria-hidden="true">
          <ChevronRight size={24} />
        </span>
      </div>
    </Link>
  );
}
export function CategoryGrid({ family }: { family?: Category["family"] }) {
  const shown = family
    ? categories.filter((category) => category.family === family)
    : categories;
  return (
    <div className="category-grid">
      {shown.map((category) => (
        <CategoryCard key={category.slug} category={category} />
      ))}
    </div>
  );
}
export function BrowseCategories() {
  return (
    <section
      id="categories"
      className="browse-section"
      aria-labelledby="browse-title"
    >
      <h2 id="browse-title" className="section-title">
        Browse by Category
      </h2>
      <CategoryGrid />
    </section>
  );
}
