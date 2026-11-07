import Link from "next/link";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
import { VideoGuideLibrary } from "@/components/guides/video-guide-library";
import { videoGuides } from "@/config/video-guides";
export const metadata = { title: "Identification Guides" };
export default function GuidesPage() {
  return (
    <ScaffoldPage
      title="How to Identify Your Part"
      description="Start with clear photos, visible markings, and measurements you can safely obtain."
    >
      <div className="next-action-grid">
        <Link className="intake-card next-action" href="/guides/measurements">
          <h2>Measurement &amp; Identification Help</h2>
          <p>
            Learn screw-hole spacing, roller and housing dimensions, balance
            measurements, backsets, and orientation.
          </p>
          <span className="measurement-help">View measurement topics →</span>
        </Link>
        <Link className="intake-card next-action" href="/find-part/guided">
          <h2>Guided Finder</h2>
          <p>
            Use a few questions to narrow down a possible hardware family when
            you don’t know its name.
          </p>
          <span className="measurement-help">Start Guided Finder →</span>
        </Link>
      </div>
      <section className="intake-card guide-section">
        <h2>Take useful identification photos</h2>
        <ul>
          <li>
            Show the whole part and where it is installed, if safely accessible.
          </li>
          <li>
            Add clear views of markings, mounting holes, end fittings, and the
            opposite side.
          </li>
          <li>
            Keep your original observations and label any reference points you
            measured.
          </li>
        </ul>
        <p>
          You can select one local photo at a time. Automated matching is not
          connected.
        </p>
        <Link className="button button-primary" href="/#photo-upload">
          Take or upload a photo
        </Link>
      </section>
      <VideoGuideLibrary videos={videoGuides} />
    </ScaffoldPage>
  );
}
