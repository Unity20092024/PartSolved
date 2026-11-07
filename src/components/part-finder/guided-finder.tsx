"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  DoorOpen,
  PanelsTopLeft,
  CircleHelp,
} from "lucide-react";
import { AssistanceFlow } from "./assistance/assistance-flow";
import { RecoveryHub } from "./assistance/recovery-hub";
import { usePhoto } from "./photo-provider";
import { WorkflowShell } from "./workflow-shell";
import {
  guidedLabel,
  guidedSuggestion,
  guidedTypes,
  guidedValid,
  locations,
  purposes,
} from "@/config/guided";
import { categoryLabel, getPartType } from "@/config/part-types";
import { applyGuidedAnswers } from "@/lib/intake";
import type { GuidedAnswers } from "@/types/intake";
const questions = [
  "Where is the part located?",
  "What does the part do?",
  "What does it look like?",
  "Do you have measurements or markings?",
  "Review your answers",
];
export function GuidedFinder() {
  const { guided, setGuided, setDraft, assistance, setAssistance } = usePhoto();
  const router = useRouter();
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const suggestion = guidedSuggestion(guided);
  function update(values: Partial<GuidedAnswers>) {
    setGuided((previous) => ({ ...previous, ...values, completed: false }));
    setError("");
  }
  function go(step: number) {
    setGuided((previous) => ({ ...previous, step }));
    setError("");
    requestAnimationFrame(() => heading.current?.focus());
  }
  function next() {
    if (!guidedValid(guided, guided.step)) {
      setError("Choose an answer, including Not Sure, before continuing.");
      return;
    }
    go(guided.step + 1);
  }
  function apply() {
    if ([0, 1, 2, 3].some((step) => !guidedValid(guided, step))) {
      setError("Review each question before using these answers.");
      return;
    }
    setGuided((previous) => ({ ...previous, completed: true }));
    setDraft((previous) => applyGuidedAnswers(previous, guided));
    router.push("/find-part/details");
  }
  const candidates = guidedTypes(guided);
  const prior = getPartType(guided.appearance);
  const choices =
    prior && !candidates.some((type) => type.id === prior.id)
      ? [...candidates, prior]
      : candidates;
  if (assistance.view !== "questions") return <AssistanceFlow />;
  return (
    <WorkflowShell
      title="Guided Finder"
      description="Not sure what your part is called? Answer a few quick questions to narrow down a possible category."
      back="/"
    >
      <button
        type="button"
        className="measurement-help text-button"
        onClick={() =>
          setAssistance((previous) => ({
            ...previous,
            view: "hub",
            location: previous.location || guided.location,
          }))
        }
      >
        Need a simpler way? Get help without knowing the part
      </button>
      {guided.step === 0 && (
        <p className="field-hint">
          Returning after a refresh? Photos and answers are held only in this
          tab’s memory and must be added again after a refresh.
        </p>
      )}
      <ol className="guided-progress" aria-label="Guided Finder progress">
        {questions.map((question, index) => (
          <li
            key={question}
            aria-current={guided.step === index ? "step" : undefined}
          >
            <button
              type="button"
              className={guided.step === index ? "current" : ""}
              disabled={
                index > guided.step &&
                [...Array(index).keys()].some(
                  (step) => !guidedValid(guided, step),
                )
              }
              onClick={() => go(index)}
              aria-label={`Question ${index + 1}: ${question}`}
            >
              <span>{index + 1}</span>
              <span className="guided-step-label">
                {index === 4 ? "Review" : `Step ${index + 1}`}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <section className="intake-card guided-question">
        <h2 ref={heading} tabIndex={-1}>
          <span className="question-number">{guided.step + 1}</span>
          {questions[guided.step]}
        </h2>
        <p className="field-hint">
          Step {guided.step + 1} of 5. Your earlier answers are kept while you
          edit.
        </p>
        {guided.step === 0 && (
          <fieldset>
            <legend className="sr-only">Where is the part located?</legend>
            <div className="guided-choice-grid">
              {locations.map((location) => {
                const Icon =
                  location.id === "window"
                    ? PanelsTopLeft
                    : location.id === "not-sure"
                      ? CircleHelp
                      : DoorOpen;
                return (
                  <label
                    key={location.id}
                    className={`choice-card ${guided.location === location.id ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="location"
                      checked={guided.location === location.id}
                      onChange={() => update({ location: location.id })}
                    />
                    <Icon size={32} aria-hidden="true" />
                    <span>{location.label}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
        {guided.step === 1 && (
          <fieldset className="radio-list">
            <legend className="sr-only">What does the part do?</legend>
            {purposes(guided.location).map((purpose) => (
              <label key={purpose.id}>
                <input
                  type="radio"
                  name="purpose"
                  checked={guided.purpose === purpose.id}
                  onChange={() => update({ purpose: purpose.id })}
                />
                {purpose.label}
              </label>
            ))}
          </fieldset>
        )}
        {guided.step === 2 && (
          <fieldset>
            <legend className="sr-only">What does it look like?</legend>
            <p className="field-hint">
              Choose the closest description. These describe hardware families,
              not exact replacement products.
            </p>
            {!candidates.length && (
              <p className="info-notice">
                These answers don’t narrow down a listed family yet. You can
                choose Other or Not Sure and continue with guidance.
              </p>
            )}
            <div className="appearance-choices">
              {choices.map((type) => (
                <label
                  key={type.id}
                  className={`choice-card appearance-choice ${guided.appearance === type.id ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="appearance"
                    checked={guided.appearance === type.id}
                    onChange={() => update({ appearance: type.id })}
                  />
                  <span>
                    <strong>{type.label}</strong>
                    <small>{type.description}</small>
                    {!candidates.some(
                      (candidate) => candidate.id === type.id,
                    ) && (
                      <small>
                        Your earlier choice is kept; check it against the new
                        answers.
                      </small>
                    )}
                  </span>
                </label>
              ))}
              {["other", "not-sure"].map((value) => (
                <label
                  className={`choice-card ${guided.appearance === value ? "selected" : ""}`}
                  key={value}
                >
                  <input
                    type="radio"
                    name="appearance"
                    checked={guided.appearance === value}
                    onChange={() => update({ appearance: value })}
                  />
                  {value === "other" ? "Other" : "Not Sure"}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {guided.step === 3 && (
          <>
            <fieldset className="radio-list">
              <legend className="sr-only">Measurements or markings</legend>
              {(
                [
                  { id: "measurements", label: "Yes, I have measurements" },
                  {
                    id: "markings",
                    label: "Yes, I have a part number or stamped code",
                  },
                  { id: "both", label: "I have both" },
                  { id: "not-sure", label: "No, I’m not sure" },
                ] as const
              ).map((option) => (
                <label key={option.id}>
                  <input
                    type="radio"
                    name="information"
                    checked={guided.information === option.id}
                    onChange={() => update({ information: option.id })}
                  />
                  {option.label}
                </label>
              ))}
            </fieldset>
            {["measurements", "both"].includes(guided.information) && (
              <>
                <label className="field-label" htmlFor="guided-measurements">
                  Measurements and reference points (include units)
                </label>
                <textarea
                  id="guided-measurements"
                  maxLength={1000}
                  rows={3}
                  value={guided.measurementNotes}
                  onChange={(event) =>
                    update({ measurementNotes: event.target.value })
                  }
                />
                <Link className="measurement-help" href="/guides/measurements">
                  Help measuring your part
                </Link>
              </>
            )}
            {["markings", "both"].includes(guided.information) && (
              <>
                <label className="field-label" htmlFor="guided-markings">
                  Part number or stamped code
                </label>
                <input
                  id="guided-markings"
                  maxLength={200}
                  value={guided.markings}
                  onChange={(event) => update({ markings: event.target.value })}
                />
              </>
            )}
          </>
        )}
        {guided.step === 4 && (
          <>
            <dl className="review-list">
              {[
                {
                  label: "Location",
                  value: guidedLabel(guided.location),
                  step: 0,
                },
                {
                  label: "Function",
                  value: guidedLabel(guided.purpose),
                  step: 1,
                },
                {
                  label: "Appearance",
                  value: guidedLabel(guided.appearance),
                  step: 2,
                },
                {
                  label: "Measurements / markings",
                  value:
                    guided.information === "not-sure"
                      ? "Not known"
                      : [guided.measurementNotes, guided.markings]
                          .filter(Boolean)
                          .join(" · ") || "No values entered yet",
                  step: 3,
                },
              ].map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => go(item.step)}
                    aria-label={`Edit ${item.label.toLowerCase()}`}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </dl>
            {suggestion.uncertain && <RecoveryHub />}
            {suggestion.category !== "not-sure" && (
              <div className="info-notice">
                <h3>Possible category: {categoryLabel(suggestion.category)}</h3>
                <p>
                  {suggestion.uncertain
                    ? "More information is needed to narrow this down. Continue with Not Sure, or use measurement help."
                    : "Your answers suggest this hardware family for further investigation."}{" "}
                  This is a category suggestion, not a verified product match or
                  compatibility assessment.
                </p>
              </div>
            )}
            <Link className="measurement-help" href="/guides/measurements">
              View measurement and identification guidance
            </Link>
          </>
        )}
        {guided.step < 4 &&
          [
            guided.location,
            guided.purpose,
            guided.appearance,
            guided.information,
          ][guided.step] &&
          ["not-sure", "other"].includes(
            [
              guided.location,
              guided.purpose,
              guided.appearance,
              guided.information,
            ][guided.step],
          ) && (
            <div className="info-notice">
              <p>
                You don’t need to know this answer. Try pictures or describe the
                problem instead.
              </p>
              <button
                type="button"
                className="measurement-help text-button"
                onClick={() =>
                  setAssistance((previous) => ({
                    ...previous,
                    view: "hub",
                    location: previous.location || guided.location,
                  }))
                }
              >
                Try pictures and symptoms instead
              </button>
            </div>
          )}
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <div className="workflow-actions">
        {guided.step > 0 ? (
          <button
            className="button button-secondary"
            onClick={() => go(guided.step - 1)}
          >
            <ArrowLeft size={18} aria-hidden="true" />
            Back
          </button>
        ) : (
          <Link className="button button-secondary" href="/">
            Back
          </Link>
        )}
        {guided.step < 4 ? (
          <button className="button button-primary" onClick={next}>
            Continue
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        ) : (
          <button className="button button-primary" onClick={apply}>
            Use these answers
            <ArrowRight size={19} aria-hidden="true" />
          </button>
        )}
      </div>
    </WorkflowShell>
  );
}
