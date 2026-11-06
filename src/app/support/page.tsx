import Link from "next/link";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
export const metadata = { title: "Support" };
export default function SupportPage() {
  return (
    <ScaffoldPage
      title="Support"
      description="Help with photos, saved progress, and the current identification workflow."
    >
      <section className="intake-card guide-section">
        <h2>Camera or upload not opening?</h2>
        <p>
          The camera button asks your browser to open its native camera or file
          picker. Availability depends on the browser and device. You can always
          choose Upload a Photo instead of requesting a camera.
        </p>
        <p>
          Some in-app or automated review browsers cannot display native file
          pickers. Try the page in your regular browser. If a camera permission
          prompt appears, you can cancel it and upload an existing JPEG, PNG, or
          WebP photo of 10 MiB or less.
        </p>
        <Link className="button button-primary" href="/#photo-upload">
          Take or upload a photo
        </Link>
      </section>
      <section className="intake-card guide-section">
        <h2>Your progress and privacy</h2>
        <p>
          Photos and answers stay in this tab’s memory while you navigate
          between the photo, details, guided, and review pages. Refreshing or
          closing the tab clears them. A recovery message helps you select a
          photo again.
        </p>
        <p>
          PartSolved does not upload your photographs or send them to an
          external AI service. Automated product matching is not connected.
        </p>
        <Link className="measurement-help" href="/find-part/guided">
          Use Guided Finder without a photo
        </Link>
      </section>
      <section className="intake-card guide-section">
        <h2>Measurement help</h2>
        <p>
          Record what you can safely see and select Unknown when you cannot
          measure a part. The guides cover mounting-hole spacing, rollers,
          balances, backsets, and orientation.
        </p>
        <Link className="measurement-help" href="/guides/measurements">
          View measurement guidance
        </Link>
      </section>
      <section className="intake-card guide-section">
        <h2>Shopping and order support</h2>
        <p>
          Partner ordering, supplier inventory, and checkout are not connected
          yet. Future supplier orders will be fulfilled and supported by the
          supplier partner. No purchase or compatibility confirmation can be
          made here at this stage.
        </p>
      </section>
    </ScaffoldPage>
  );
}
