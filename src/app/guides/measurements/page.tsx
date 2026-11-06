import Link from "next/link";
import Image from "next/image";
import { ScaffoldPage } from "@/components/ui/scaffold-page";
import { MeasurementDiagram } from "@/components/ui/measurement-diagram";
import { guideTitles, partTypes } from "@/config/part-types";
import { photography } from "@/config/photography";
import type { MeasurementGuide } from "@/types/intake";
export const metadata = {
  title: "Measurement & Identification Help",
  description:
    "Practical guidance for recording window and door hardware measurements, markings, end fittings, and orientation.",
};
const sections: {
  id: MeasurementGuide;
  diagram?: "spacing" | "size" | "roller" | "balance" | "backset";
  points: string[];
}[] = [
  {
    id: "screw-spacing",
    diagram: "spacing",
    points: [
      "Measure from the center of one mounting hole to the center of the next. Record lock and keeper hole spacing separately.",
      "For more than two holes, sketch their pattern and record each relevant spacing. Include the units; do not round to an expected replacement size.",
    ],
  },
  {
    id: "overall-size",
    diagram: "size",
    points: [
      "Record overall length, width, and depth separately. Note whether covers, tabs, arms, or end fittings are included.",
      "For operator arms, state the points measured (for example pivot centers or end-to-end). Supplier conventions can differ, so retain photos and the original observations.",
    ],
  },
  {
    id: "roller-diameter",
    diagram: "roller",
    points: [
      "Measure across the wheel through its center, excluding the housing. Record the wheel’s width and profile in notes if you can see them.",
      "A worn wheel can give an incomplete measurement. Photograph its profile and do not assume an exact replacement diameter from the photo alone.",
    ],
  },
  {
    id: "roller-housing",
    points: [
      "Measure the metal housing length, width, and height independently from the wheel. Describe mounting tabs and adjustment screws.",
      "Record whether a measurement includes tabs or adjustable wheel extension. Do not remove a heavy glass door just to obtain a measurement; use a qualified professional when removal is needed.",
    ],
  },
  {
    id: "window-balances",
    diagram: "balance",
    points: [
      "First distinguish a spiral tube from a metal channel using its visible construction. Photograph all markings before recording dimensions.",
      "Record the metal tube or channel length separately from rods and end fittings. For tubes record diameter; for channels record width and depth. Exact manufacturer measurement conventions must be checked later.",
      "Balance systems may be under spring tension and support the sash. Do not release tension, dismantle a balance, or remove a supported sash just to measure it. Record Unknown when access is unsafe.",
    ],
  },
  {
    id: "balance-fittings",
    points: [
      "Photograph both ends and the side profile, including hooks, shoes, wings, clips, and any stamped markings. Label which end is which.",
      "Record how each fitting attaches and note any missing or broken pieces. Similar-looking fittings are not proof of interchangeability.",
    ],
  },
  {
    id: "lock-backset",
    diagram: "backset",
    points: [
      "Record the distance from the faceplate or door-edge reference to the operating spindle/key center, and state exactly which reference points you used.",
      "Photograph the lock faceplate and body, mounting holes, and latch or hook direction. Do not infer lock compatibility from backset alone; manufacturer documentation defines the relevant reference points.",
    ],
  },
  {
    id: "orientation",
    points: [
      "State which side you were viewing: inside, outside, hinge side, or another clearly described position. Photograph both sides and the direction the part moves.",
      "Left/right and handing conventions vary by manufacturer and hardware family. Choose Not Sure if you cannot confirm the intended convention. Do not mirror reference photos to infer handing.",
    ],
  },
];
export default function MeasurementGuides() {
  return (
    <ScaffoldPage
      title="Measure Your Window or Door Part"
      description="Record what you can safely observe. Clear reference points and honest unknowns are more useful than guesses."
    >
      <nav className="guide-toc intake-card" aria-label="Measurement topics">
        <h2>Jump to a measurement topic</h2>
        <ul>
          {sections.map((section) => (
            <li key={section.id}>
              <Link href={`#${section.id}`}>{guideTitles[section.id]}</Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="info-notice">
        <p>
          These are general, provisional identification tips—not manufacturer
          specifications or compatibility rules. Verify measurements against the
          manufacturer’s documentation before ordering. Keep glass and
          spring-loaded hardware supported; ask a qualified professional when
          access or removal is unsafe.
        </p>
      </div>
      {photography.measurement && (
        <figure className="guide-photo">
          <Image
            src={photography.measurement.src}
            alt={photography.measurement.alt}
            width={774}
            height={420}
            sizes="(max-width: 700px) 100vw, 650px"
          />
          <figcaption>
            A real window sash being measured. Record the part, reference
            points, and units used.
          </figcaption>
        </figure>
      )}
      {sections.map((section) => (
        <section
          className="intake-card guide-section"
          id={section.id}
          key={section.id}
        >
          <h2>{guideTitles[section.id]}</h2>
          {section.diagram && <MeasurementDiagram kind={section.diagram} />}
          <ul>
            {section.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
          <p className="field-hint">
            Relevant intake prompts:{" "}
            {partTypes
              .filter(
                (type) =>
                  type.measurements.some(
                    (field) => field.guide === section.id,
                  ) ||
                  (section.id === "orientation" && type.orientation),
              )
              .map((type) => type.label)
              .join(" · ") ||
              "Record observations in the measurement notes for any hardware family."}
          </p>
          <Link href="/find-part/details" className="measurement-help">
            Return to Add Details
          </Link>
        </section>
      ))}
      <div className="workflow-actions">
        <Link className="button button-secondary" href="/find-part/guided">
          Back to Guided Finder
        </Link>
        <Link className="button button-primary" href="/find-part/review">
          Review your information
        </Link>
      </div>
    </ScaffoldPage>
  );
}
