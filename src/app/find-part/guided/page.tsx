import Link from "next/link";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
export const metadata = { title: "Guided Finder" };
export default function GuidedPage() {
  return (
    <ScaffoldPage
      title="Guided Finder"
      description="Answer a few quick questions to narrow down your part — coming in a future release."
    >
      <div className="scaffold-card">
        <h2>The guided finder is not available yet</h2>
        <p>
          The question flow and identification engine will be built in a later
          milestone. You can start by selecting a photo of your part.
        </p>
        <Link className="button button-primary" href="/#photo-upload">
          Select a part photo
        </Link>
      </div>
    </ScaffoldPage>
  );
}
