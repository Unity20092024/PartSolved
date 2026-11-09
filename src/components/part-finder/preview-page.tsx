"use client";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { usePhoto } from "./photo-provider";
import { IntakePhoto } from "./intake-photo";
import { PhotoRecovery } from "./photo-recovery";
import { WorkflowShell } from "./workflow-shell";
import dynamic from "next/dynamic";
const PhotoAssist = dynamic(() =>
  import("./ai/photo-assist").then((module) => module.PhotoAssist),
);
export function PreviewPage({
  photoAssistAvailable = false,
}: {
  photoAssistAvailable?: boolean;
}) {
  const { photo, draft, photoBusy } = usePhoto();
  return (
    <WorkflowShell
      title="Review Your Photo"
      photoAssistAvailable={photoAssistAvailable}
      description="Check that your part is clear and in focus before adding identification details."
      step={0}
      back="/#photo-upload"
    >
      {!photo && draft.source !== "guided" ? (
        <PhotoRecovery />
      ) : (
        <IntakePhoto />
      )}
      {photoAssistAvailable && <PhotoAssist />}
      {(photo || draft.source === "guided") && (
        <div className="workflow-actions">
          <Link className="button button-secondary" href="/#photo-upload">
            Back
          </Link>
          <Link
            className="button button-primary"
            href="/find-part/details"
            aria-disabled={photoBusy}
            onClick={(event) => {
              if (photoBusy) event.preventDefault();
            }}
          >
            Continue to Add Details
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>
      )}
    </WorkflowShell>
  );
}
