import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { categories } from "@/config/categories";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
export function generateStaticParams() {
  return categories.map(({ slug }) => ({ slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title:
      categories.find((category) => category.slug === slug)?.title ??
      "Category not found",
  };
}
export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const category = categories.find((item) => item.slug === slug);
  if (!category) notFound();
  return (
    <ScaffoldPage title={category.title} description={category.subtitle}>
      <div className="scaffold-card">
        <h2>Our catalog is on the way</h2>
        <p>
          Products, availability, and pricing have not been connected yet. You
          can select a part photo to prepare for the upcoming identification
          flow.
        </p>
        <Link href="/#photo-upload" className="button button-primary">
          Select a part photo
        </Link>
      </div>
    </ScaffoldPage>
  );
}
