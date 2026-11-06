import Link from "next/link";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
export const metadata = { title: "Identification Guides" };
export default function GuidesPage() {
  return (
    <ScaffoldPage
      title="How to Identify Your Part"
      description="Simple guides, photos, and measurement tips are planned for a future release."
    >
      <div className="scaffold-card">
        <h2>Guides are being prepared</h2>
        <p>
          The illustrated identification guides and video library are not
          available yet. For now, you can select a clear photo of your part and
          keep it locally in your browser.
        </p>
        <Link className="button button-primary" href="/#photo-upload">
          Select a part photo
        </Link>
      </div>
    </ScaffoldPage>
  );
}
