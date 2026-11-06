import Link from "next/link";
import { IntakePhoto } from "./intake-photo";
export function PhotoRecovery() {
  return (
    <>
      <div className="recovery-notice" role="status">
        <h2>Your photo is no longer available</h2>
        <p>
          If you refreshed, opened a new tab, or closed the original tab, the
          photo and answers were cleared. If you only removed the image, your
          current answers are still kept in this tab. Select a photo to
          continue.
        </p>
      </div>
      <IntakePhoto />
      <Link href="/find-part/guided" className="back-link">
        Use Guided Finder without a photo
      </Link>
    </>
  );
}
