import { CatalogResults } from "@/components/part-finder/catalog-results";
export const dynamic = "force-dynamic";
export const metadata = {
  title: "Catalog Results",
  robots: { index: false, follow: false },
  referrer: "same-origin" as const,
};
export default function Page() {
  return <CatalogResults />;
}
