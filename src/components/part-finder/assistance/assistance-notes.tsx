"use client";
import Link from "next/link";
import { usePhoto } from "../photo-provider";
import { PhotoPreview } from "../photo-preview";
import { assistanceSummary } from "@/lib/assistance-export";
export function AssistanceNotes() {
  const { assistance, guided, photo, setAssistance } = usePhoto();
  if (
    !assistance.symptom &&
    !assistance.area &&
    !assistance.similar.length &&
    !assistance.photos.length &&
    !assistance.description
  )
    return null;
  return (
    <section className="intake-card">
      <h2>Guided assistance notes</h2>
      <p>
        These observations and supporting photos are local reference
        information, not a verified diagnosis.
      </p>
      <details>
        <summary>Review assistance answers and supporting photos</summary>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            overflowWrap: "anywhere",
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        >
          {assistanceSummary(assistance, guided, photo)}
        </pre>
        {assistance.photos.map((item) => (
          <PhotoPreview key={item.id} photo={item.file} />
        ))}
      </details>
      <Link
        href="/find-part/guided"
        className="measurement-help"
        onClick={() =>
          setAssistance((previous) => ({ ...previous, view: "summary" }))
        }
      >
        Edit or download assistance information
      </Link>
    </section>
  );
}
