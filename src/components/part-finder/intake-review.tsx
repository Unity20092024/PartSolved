"use client";
import Link from "next/link";
import { ArrowRight, BookOpen, ListChecks, Pencil } from "lucide-react";
import { usePhoto } from "./photo-provider";
import { WorkflowShell } from "./workflow-shell";
import { PhotoPreview } from "./photo-preview";
import { PhotoRecovery } from "./photo-recovery";
import {
  buildIdentificationIntake,
  selectedType,
  validateDraft,
} from "@/lib/intake";
import { categoryLabel, getPartType, partTypeLabel } from "@/config/part-types";
import { AssistanceNotes } from "./assistance/assistance-notes";
import { guidedLabel } from "@/config/guided";
export function IntakeReview({ nextSteps = false }: { nextSteps?: boolean }) {
  const { photo, draft, guided } = usePhoto();
  const errors = validateDraft(draft),
    type = selectedType(draft),
    definition = getPartType(type);
  const request = Object.keys(errors).length
    ? null
    : buildIdentificationIntake(draft, guided);
  const guide = definition?.measurements[0]?.guide ?? "overall-size";
  const missing = [
    ...(draft.category === "not-sure"
      ? ["Hardware category is not known"]
      : []),
    ...(["not-sure", "other"].includes(type)
      ? ["Specific hardware type needs clarification"]
      : []),
    ...(request?.measurements
      .filter((item) => item.status !== "provided")
      .map(
        (item) =>
          `${definition?.measurements.find((field) => field.id === item.id)?.label}: ${item.status === "unknown" ? "Unknown" : "Not provided"}`,
      ) ?? []),
    ...(!photo ? ["No photo attached"] : []),
  ];
  const actions = (
    <div className="next-action-grid">
      <Link className="intake-card next-action" href="/find-part/details">
        <Pencil aria-hidden="true" />
        <h3>Improve your details</h3>
        <p>Add or correct measurements, markings, and observations.</p>
      </Link>
      <Link
        className="intake-card next-action"
        href={`/guides/measurements#${guide}`}
      >
        <BookOpen aria-hidden="true" />
        <h3>Measurement guidance</h3>
        <p>Learn how to record reference points for this hardware family.</p>
      </Link>
      <Link
        className="intake-card next-action"
        href={
          draft.category && draft.category !== "not-sure"
            ? `/categories/${draft.category}`
            : "/#categories"
        }
      >
        <ListChecks aria-hidden="true" />
        <h3>Browse hardware categories</h3>
        <p>
          Explore the category structure. Live supplier products are not
          connected.
        </p>
      </Link>
      <Link className="intake-card next-action" href="/find-part/guided">
        <ArrowRight aria-hidden="true" />
        <h3>Use Guided Finder</h3>
        <p>Work through descriptions to narrow a possible hardware family.</p>
      </Link>
    </div>
  );
  return (
    <WorkflowShell
      title={
        nextSteps ? "Your Next Steps" : "Review Identification Information"
      }
      description={
        nextSteps
          ? "Use your recorded details to choose useful identification guidance."
          : "Check your photo, measurements, and observations. You can edit any section."
      }
      step={2}
      completedSteps={[...(photo ? [0] : []), ...(request ? [1] : [])]}
      optionalPhoto={draft.source === "guided"}
      back={nextSteps ? "/find-part/review" : "/find-part/details"}
    >
      <AssistanceNotes />
      {!photo && draft.source === "photo" ? (
        <PhotoRecovery />
      ) : !request ? (
        <div className="intake-card">
          <h2>Add your identification details</h2>
          <p>
            Choose a category and part type, or select Not Sure. Correct any
            invalid measurements before reviewing.
          </p>
          <Link className="button button-primary" href="/find-part/details">
            Go to Add Details
          </Link>
        </div>
      ) : (
        <>
          <div className="info-notice" role="status">
            <h2>Automated product matching is not connected yet</h2>
            <p>
              Your information is kept locally for this workflow. No photo has
              been submitted, no products have been identified, and
              compatibility has not been verified.
            </p>
          </div>
          {nextSteps ? (
            <>
              <div className="intake-card">
                <h2>Identification information prepared</h2>
                <p>
                  {categoryLabel(request.category)} · {partTypeLabel(type)}
                </p>
                <p>
                  {
                    request.measurements.filter(
                      (item) => item.status === "provided",
                    ).length
                  }{" "}
                  measurements recorded.{" "}
                  {missing.length
                    ? `${missing.length} items are still unknown or missing.`
                    : "You can still add photos of markings or confirm your reference points."}
                </p>
                <Link href="/find-part/review" className="measurement-help">
                  Review all information
                </Link>
              </div>
              {actions}
            </>
          ) : (
            <>
              <section className="intake-card review-photo">
                <div>
                  {photo ? (
                    <PhotoPreview photo={photo} />
                  ) : (
                    <p>
                      No photo attached. Guided identification can continue
                      without one.
                    </p>
                  )}
                </div>
                <Link
                  className="button button-secondary"
                  href="/find-part/preview"
                >
                  {photo ? "Edit photo" : "Add optional photo"}
                </Link>
              </section>
              <section className="intake-card">
                <div className="review-heading">
                  <h2>Hardware</h2>
                  <Link
                    className="text-button"
                    href="/find-part/details#hardware-category"
                  >
                    Edit category and type
                  </Link>
                </div>
                <dl className="review-list">
                  <div>
                    <dt>Category</dt>
                    <dd>{categoryLabel(request.category)}</dd>
                  </div>
                  <div>
                    <dt>Part type</dt>
                    <dd>{partTypeLabel(type)}</dd>
                  </div>
                </dl>
              </section>
              <section className="intake-card">
                <div className="review-heading">
                  <h2>Measurements</h2>
                  <Link
                    className="text-button"
                    href="/find-part/details#measurements-title"
                  >
                    Edit measurements
                  </Link>
                </div>
                <p className="field-hint">
                  Provisional identification measurements only. They do not
                  establish fit or compatibility.
                </p>
                <dl className="review-list">
                  {request.measurements.map((item) => (
                    <div key={item.id}>
                      <dt>
                        {
                          definition?.measurements.find(
                            (field) => field.id === item.id,
                          )?.label
                        }
                      </dt>
                      <dd>
                        {item.status === "provided"
                          ? `${item.enteredValue} ${item.unit}`
                          : item.status === "unknown"
                            ? "Unknown"
                            : "Not provided"}
                      </dd>
                    </div>
                  ))}
                </dl>
                {!request.measurements.length && (
                  <p>No structured measurements selected for this part type.</p>
                )}
                <h3>Measurement notes</h3>
                <p className="preserve-lines">
                  {request.measurementNotes || "Not provided"}
                </p>
              </section>
              <section className="intake-card">
                <div className="review-heading">
                  <h2>Markings &amp; Additional Details</h2>
                  <Link
                    className="text-button"
                    href="/find-part/details#additional-title"
                  >
                    Edit additional details
                  </Link>
                </div>
                <dl className="review-list">
                  {[
                    {
                      label: "Manufacturer / Brand",
                      value: request.manufacturer,
                    },
                    {
                      label: "Part Number / Markings",
                      value: request.markings,
                    },
                    { label: "Color / Finish", value: request.finish },
                    ...(definition?.orientation
                      ? [
                          {
                            label: "Orientation",
                            value:
                              request.orientation === "not-sure"
                                ? "Not Sure"
                                : request.orientation,
                          },
                        ]
                      : []),
                    { label: "Problem / Notes", value: request.problem },
                  ].map((item) => (
                    <div key={item.label}>
                      <dt>{item.label}</dt>
                      <dd className="preserve-lines">
                        {item.value || "Not provided"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
              {guided.completed && (
                <section className="intake-card">
                  <div className="review-heading">
                    <h2>Guided Finder answers</h2>
                    <Link className="text-button" href="/find-part/guided">
                      Edit guided answers
                    </Link>
                  </div>
                  <dl className="review-list">
                    <div>
                      <dt>Location</dt>
                      <dd>{guidedLabel(guided.location)}</dd>
                    </div>
                    <div>
                      <dt>Function</dt>
                      <dd>{guidedLabel(guided.purpose)}</dd>
                    </div>
                    <div>
                      <dt>Appearance</dt>
                      <dd>{guidedLabel(guided.appearance)}</dd>
                    </div>
                    <div>
                      <dt>Measurement observations</dt>
                      <dd className="preserve-lines">
                        {["measurements", "both"].includes(guided.information)
                          ? guided.measurementNotes || "Not provided"
                          : "Not known"}
                      </dd>
                    </div>
                    <div>
                      <dt>Stamped markings</dt>
                      <dd>
                        {["markings", "both"].includes(guided.information)
                          ? guided.markings || "Not provided"
                          : "Not known"}
                      </dd>
                    </div>
                  </dl>
                  <p className="field-hint">
                    These are your observations and category suggestions, not
                    verified matches.
                  </p>
                </section>
              )}
              <section className="intake-card missing-information">
                <h2>Missing or unknown information</h2>
                {missing.length ? (
                  <>
                    <ul>
                      {missing.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                    <p>
                      You can continue with uncertainty and return to improve
                      these details.
                    </p>
                  </>
                ) : (
                  <p>
                    All selected measurement prompts have values. This does not
                    verify that the part has been correctly identified.
                  </p>
                )}
                <Link
                  className="measurement-help"
                  href={`/guides/measurements#${guide}`}
                >
                  Get help with missing measurements
                </Link>
              </section>
              <div className="workflow-actions">
                <Link
                  href="/find-part/details"
                  className="button button-secondary"
                >
                  Back to Add Details
                </Link>
                <Link
                  href="/find-part/next-steps"
                  className="button button-primary"
                >
                  Continue to Next Steps
                  <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
              {actions}
            </>
          )}
        </>
      )}
    </WorkflowShell>
  );
}
