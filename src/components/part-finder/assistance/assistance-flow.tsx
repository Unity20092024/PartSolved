"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePhoto } from "../photo-provider";
import { WorkflowShell } from "../workflow-shell";
import { RecoveryHub } from "./recovery-hub";
import { AssistancePhotos } from "./assistance-photos";
import { FamilyCard } from "./family-card";
import { LocationDiagram } from "./hardware-illustration";
import {
  assistanceLocations,
  problemAreas,
  stuckChoices,
  symptomChoices,
} from "@/config/assistance";
import {
  adoptFamily,
  orderedFamilies,
  suggestFamilies,
} from "@/lib/assistance";
import {
  assistanceSummary,
  downloadBlob,
  localSummaryArchive,
} from "@/lib/assistance-export";
import {
  emptyAssistance,
  type AssistanceState,
  type AssistanceView,
} from "@/types/assistance";
import type { PartFamily } from "@/types/assistance";
import "./assistance.css";
import dynamic from "next/dynamic";
const PhotoAssist = dynamic(() =>
  import("../ai/photo-assist").then((module) => module.PhotoAssist),
);

const titles: Record<Exclude<AssistanceView, "questions">, string> = {
  hub: "A simpler way to find your part",
  location: "What are you having trouble with?",
  area: "Tap where the problem is",
  symptom: "What's happening?",
  stuck: "Where does it seem to get stuck?",
  photos: "Show What's Broken",
  common: "Show Me Common Parts",
  results: "Here's What Might Be Causing the Problem",
  summary: "Your local identification summary",
};
export function AssistanceFlow({
  photoAssistAvailable = false,
}: {
  photoAssistAvailable?: boolean;
}) {
  const {
    assistance: state,
    setAssistance,
    guided,
    photo,
    setDraft,
  } = usePhoto();
  const router = useRouter();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [exporting, setExporting] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const view = state.view === "questions" ? "hub" : state.view;
  useEffect(() => {
    (
      heading.current || document.getElementById("assist-recovery-title")
    )?.focus();
  }, [view]);
  const update = (values: Partial<AssistanceState>) => {
    setAssistance((previous) => ({ ...previous, ...values }));
    setError("");
  };
  function go(next: AssistanceView) {
    update({ view: next });
    setNotice("");
  }
  function next() {
    const key =
      view === "location"
        ? "location"
        : view === "area"
          ? "area"
          : view === "symptom"
            ? "symptom"
            : view === "stuck"
              ? "stuck"
              : null;
    if (key && !state[key]) {
      setError("Choose an option, including Not sure, to continue.");
      return;
    }
    go(
      view === "location"
        ? "area"
        : view === "area"
          ? "symptom"
          : view === "symptom" &&
              state.location === "sliding-patio-door" &&
              state.symptom === "hard-slide"
            ? "stuck"
            : "results",
    );
  }
  function chooseFamily(family: PartFamily) {
    setDraft((previous) => adoptFamily(previous, family.id, state.description));
    setAssistance((previous) => ({
      ...previous,
      similar: [...new Set([...previous.similar, family.id])],
      rejected: previous.rejected.filter((id) => id !== family.id),
    }));
    router.push("/find-part/details");
  }
  function toggleFamily(id: string, similar: boolean) {
    setAssistance((previous) => ({
      ...previous,
      similar: similar
        ? [...new Set([...previous.similar, id])]
        : previous.similar.filter((item) => item !== id),
      rejected: similar
        ? previous.rejected.filter((item) => item !== id)
        : [...new Set([...previous.rejected, id])],
    }));
  }
  const summary = assistanceSummary(state, guided, photo);
  const suggestions = suggestFamilies(state);
  const options =
    view === "location"
      ? assistanceLocations
      : view === "area"
        ? problemAreas(state.location)
        : view === "symptom"
          ? symptomChoices(state.location)
          : stuckChoices;
  const answerKey =
    view === "location"
      ? "location"
      : view === "area"
        ? "area"
        : view === "symptom"
          ? "symptom"
          : "stuck";
  const back: AssistanceView =
    view === "area"
      ? "location"
      : view === "stuck"
        ? "symptom"
        : view === "symptom"
          ? "area"
          : "hub";
  return (
    <WorkflowShell
      title="Guided Finder Assistance"
      photoAssistAvailable={photoAssistAvailable}
      description="No part name or measurements needed. Your previous answers are still here."
      back="/find-part/guided"
      onBack={() => go(view === "hub" ? "questions" : back)}
    >
      {photoAssistAvailable && <PhotoAssist />}
      <nav className="assist-navigation" aria-label="Assistance methods">
        <button type="button" onClick={() => go("hub")}>
          Help options
        </button>
        <button type="button" onClick={() => go("questions")}>
          Original questions
        </button>
        <button type="button" onClick={() => go("summary")}>
          Your summary
        </button>
      </nav>
      <p className="assist-progress" role="status">
        {["location", "area", "symptom", "stuck"].includes(view)
          ? `Problem finder · step ${view === "location" ? 1 : view === "area" ? 2 : view === "symptom" ? 3 : 4} of ${state.location === "sliding-patio-door" && state.symptom === "hard-slide" ? 4 : 3}`
          : `Assistance · ${view === "hub" ? "Choose a method" : view === "results" ? "Review possibilities" : view === "common" ? "Explore examples" : view === "photos" ? "Add supporting photos" : "Keep your notes"}`}
      </p>
      {view === "hub" ? (
        <RecoveryHub />
      ) : (
        <section className="intake-card assist-step">
          <h2 ref={heading} tabIndex={-1}>
            {titles[view]}
          </h2>
          {["location", "area", "symptom", "stuck"].includes(view) && (
            <>
              {view === "symptom" && (
                <label className="assist-location-select">
                  Where is the problem?
                  <select
                    value={state.location}
                    onChange={(event) =>
                      update({
                        location: event.target.value,
                        area: "",
                        symptom: "",
                        stuck: "",
                      })
                    }
                  >
                    <option value="">Not known yet</option>
                    {assistanceLocations.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {view === "area" &&
                !["", "not-sure", "other"].includes(state.location) && (
                  <>
                    <p>
                      Simplified layout, not a repair diagram. Use the numbered
                      areas or the choices below.
                    </p>
                    <LocationDiagram
                      location={state.location}
                      selected={state.area}
                      onSelect={(area) => update({ area })}
                    />
                  </>
                )}
              <fieldset
                className={`assist-options ${view === "location" ? "assist-location-options" : ""}`}
              >
                <legend className="sr-only">{titles[view]}</legend>
                {options.map((option) => (
                  <label
                    key={option.id}
                    className={`choice-card ${state[answerKey] === option.id ? "selected" : ""}`}
                  >
                    {view === "location" &&
                      !["other", "not-sure"].includes(option.id) && (
                        <LocationDiagram location={option.id} />
                      )}
                    <span>
                      <input
                        type="radio"
                        name={`assist-${view}`}
                        value={option.id}
                        checked={state[answerKey] === option.id}
                        onChange={() =>
                          update(
                            view === "location"
                              ? {
                                  location: option.id,
                                  area: "",
                                  symptom: "",
                                  stuck: "",
                                }
                              : view === "symptom"
                                ? { symptom: option.id, stuck: "" }
                                : { [answerKey]: option.id },
                          )
                        }
                      />
                      {option.label}
                    </span>
                  </label>
                ))}
              </fieldset>
              {view === "symptom" && state.symptom === "other" && (
                <label>
                  Describe what is happening (optional)
                  <textarea
                    maxLength={2000}
                    rows={4}
                    value={state.description}
                    onChange={(event) =>
                      update({ description: event.target.value })
                    }
                  />
                </label>
              )}
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
              <div className="workflow-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => go(back)}
                >
                  Back
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={next}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {view === "photos" && (
            <>
              <AssistancePhotos />
              <div className="workflow-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => go("location")}
                >
                  Choose a Problem Area
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => go("results")}
                >
                  Review Available Information
                </button>
              </div>
            </>
          )}
          {view === "common" && (
            <>
              <p>
                These are examples of hardware families, not exact replacement
                products. You can select more than one or leave every example
                unselected.
              </p>
              <div className="assist-family-grid">
                {orderedFamilies(state).map((family) => (
                  <FamilyCard
                    key={family.id}
                    family={family}
                    selected={state.similar.includes(family.id)}
                    rejected={state.rejected.includes(family.id)}
                    onSimilar={() => toggleFamily(family.id, true)}
                    onReject={() => toggleFamily(family.id, false)}
                    onAdopt={() => chooseFamily(family)}
                  />
                ))}
              </div>
              <div className="workflow-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => go("hub")}
                >
                  Back
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => go("results")}
                >
                  Review Possibilities
                </button>
              </div>
            </>
          )}
          {view === "results" && (
            <>
              <p className="info-notice">
                These are possible part categories based on your answers, not
                verified product matches. Confirm measurements and compatibility
                before ordering.
              </p>
              {suggestions.length ? (
                <div className="assist-results">
                  {suggestions.map(({ family, reason }) => (
                    <FamilyCard
                      key={family.id}
                      family={family}
                      reason={reason}
                      selected={state.similar.includes(family.id)}
                      rejected={state.rejected.includes(family.id)}
                      onSimilar={() => toggleFamily(family.id, true)}
                      onReject={() => toggleFamily(family.id, false)}
                      onAdopt={() => chooseFamily(family)}
                    />
                  ))}
                </div>
              ) : (
                <div className="info-notice">
                  <h3>We cannot narrow down a category yet.</h3>
                  <p>
                    That&apos;s okay. A photo alone is not analyzed here. Try
                    pointing to an area, describing a symptom, or comparing
                    common parts. You can also keep a summary of what you know.
                  </p>
                </div>
              )}
              <div className="workflow-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => go("common")}
                >
                  Show Other Possibilities
                </button>
                <button
                  className="button button-primary"
                  type="button"
                  onClick={() => go("symptom")}
                >
                  Add More Details
                </button>
              </div>
              <details>
                <summary>Start Over</summary>
                <p>
                  Restart assistance choices and remove supporting photos from
                  this flow. Your original Guided Finder answers, primary photo
                  and Add Details information will remain.
                </p>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    setAssistance({ ...emptyAssistance(), view: "hub" });
                    setNotice(
                      "Assistance restarted. Your original answers and primary photo are preserved.",
                    );
                  }}
                >
                  Restart Assistance
                </button>
              </details>
            </>
          )}
          {view === "summary" && (
            <>
              <p>
                No request for human identification help has been submitted.
                Keep a copy for your own reference. Photos and answers disappear
                if you refresh or close this tab.
              </p>
              <label>
                Identification notes
                <textarea
                  className="assist-summary"
                  rows={16}
                  readOnly
                  value={summary}
                />
              </label>
              <div className="workflow-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(summary);
                      setNotice(
                        "Notes copied. Photos are included only in the download.",
                      );
                    } catch {
                      setNotice(
                        "Clipboard unavailable. Select and copy the notes above, or download them.",
                      );
                    }
                  }}
                >
                  Copy Summary
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      downloadBlob(
                        await localSummaryArchive(summary, [
                          ...(photo ? [photo] : []),
                          ...state.photos.map((item) => item.file),
                        ]),
                        "partsolved-identification.zip",
                      );
                      setNotice(
                        "Local summary and original photos downloaded. No request was submitted.",
                      );
                    } catch {
                      setNotice(
                        "Download could not be created. You can copy the notes above.",
                      );
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  {exporting
                    ? "Preparing Download…"
                    : "Download Summary & Photos"}
                </button>
              </div>
            </>
          )}
        </section>
      )}
      {(view === "results" || view === "summary") && (
        <section className="intake-card assist-final">
          <h2>Still Can&apos;t Figure It Out?</h2>
          <p>
            We can help you organize the information you have. A staffed
            identification-request service is not connected; nothing is being
            sent for review.
          </p>
          <label>
            Describe the problem in your own words
            <textarea
              rows={3}
              maxLength={2000}
              value={state.description}
              onChange={(event) => update({ description: event.target.value })}
            />
          </label>
          <div className="assist-final-actions">
            <button type="button" onClick={() => go("photos")}>
              Add Another Photo
            </button>
            <button type="button" onClick={() => go("location")}>
              Point to the Problem
            </button>
            <button type="button" onClick={() => go("common")}>
              Review Common Hardware Pictures
            </button>
            <Link href="/guides/measurements">View Measurement Assistance</Link>
            <button type="button" onClick={() => go("summary")}>
              Copy or Download Your Summary
            </button>
            <button type="button" onClick={() => go("questions")}>
              Return to Original Answers
            </button>
          </div>
        </section>
      )}
      {notice && <p role="status">{notice}</p>}
    </WorkflowShell>
  );
}
