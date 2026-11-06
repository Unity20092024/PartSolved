import { ScaffoldPage } from "@/components/ui/scaffold-page";
import { CategoryGrid } from "@/components/home/category-grid";
export const metadata = { title: "Windows" };
export default function WindowsPage() {
  return (
    <ScaffoldPage
      title="Window Hardware & Parts"
      description="Explore the window categories below. The product catalog is coming soon."
    >
      <CategoryGrid family="windows" />
    </ScaffoldPage>
  );
}
