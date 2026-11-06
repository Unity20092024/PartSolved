import { ScaffoldPage } from "@/components/ui/scaffold-page";
import { CategoryGrid } from "@/components/home/category-grid";
export const metadata = { title: "Doors" };
export default function DoorsPage() {
  return (
    <ScaffoldPage
      title="Door Hardware & Parts"
      description="Explore the door categories below. The product catalog is coming soon."
    >
      <CategoryGrid family="doors" />
    </ScaffoldPage>
  );
}
