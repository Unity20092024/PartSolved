import { ScaffoldPage } from "@/components/ui/scaffold-page";
import { PhotoDetails } from "@/components/part-finder/photo-details";
export const metadata = {
  title: "Your Part Photo",
  robots: { index: false, follow: false },
};
export default function DetailsPage() {
  return (
    <ScaffoldPage
      title="Your Part Details"
      description="The first step toward finding the right replacement."
    >
      <div className="scaffold-card">
        <PhotoDetails />
      </div>
    </ScaffoldPage>
  );
}
