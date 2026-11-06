"use client";
import { useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  DoorOpen,
  PanelsTopLeft,
  CircleHelp,
  Settings,
  Columns3,
} from "lucide-react";
import { usePhoto } from "./photo-provider";
import { IntakePhoto } from "./intake-photo";
import { PhotoRecovery } from "./photo-recovery";
import { WorkflowShell } from "./workflow-shell";
import { MeasurementFields } from "./measurement-fields";
import {
  availablePartTypes,
  getPartType,
  hardwareCategories,
} from "@/config/part-types";
import { emptyMeasurements, selectedType, validateDraft } from "@/lib/intake";
import type { HardwareCategory } from "@/types/intake";
const icons = [PanelsTopLeft, Columns3, DoorOpen, Settings, CircleHelp];
export function PhotoDetails() {
  const { photo, draft, setDraft, photoBusy } = usePhoto();
  const router = useRouter();
  const [attempted, setAttempted] = useState(false);
  const errors = attempted ? validateDraft(draft) : {};
  const summary = useRef<HTMLDivElement>(null);
  const type = selectedType(draft),
    definition = getPartType(type),
    group = draft.measurementsByType[type] ?? emptyMeasurements();
  const back =
    draft.source === "guided" ? "/find-part/guided" : "/find-part/preview";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validateDraft(draft);
    setAttempted(true);
    if (Object.keys(found).length) {
      requestAnimationFrame(() => summary.current?.focus());
      return;
    }
    router.push("/find-part/review");
  }
  return (
    <WorkflowShell
      title="Add Details"
      description="Tell us about your part to prepare its identification information. Not Sure is always an option."
      step={1}
      completedSteps={photo ? [0] : []}
      optionalPhoto={draft.source === "guided"}
      back={back}
    >
      {!photo && draft.source === "photo" ? (
        <PhotoRecovery />
      ) : (
        <form onSubmit={submit} noValidate>
          {!photo && draft.source === "guided" && (
            <p className="info-notice">
              A photo is optional for guided identification. Add one if
              available, or continue with your answers.
            </p>
          )}
          <IntakePhoto />
          <div
            ref={summary}
            tabIndex={-1}
            className={Object.keys(errors).length ? "error-summary" : "sr-only"}
            role={Object.keys(errors).length ? "alert" : undefined}
          >
            {Object.keys(errors).length > 0 && (
              <>
                <h2>Please check these details</h2>
                <ul>
                  {Object.entries(errors).map(([id, message]) => (
                    <li key={id}>
                      <a
                        href={
                          id === "category"
                            ? "#hardware-category"
                            : id === "partType"
                              ? "#part-type"
                              : `#measure-${id}`
                        }
                      >
                        {message}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
          <fieldset
            className="form-section category-fieldset"
            id="hardware-category"
            tabIndex={-1}
            aria-describedby={errors.category ? "category-error" : undefined}
          >
            <legend>
              Hardware Category{" "}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> required</span>
            </legend>
            <div className="category-choices">
              {hardwareCategories.map((category, index) => {
                const Icon = icons[index];
                return (
                  <label
                    className={`choice-card ${draft.category === category.id ? "selected" : ""}`}
                    key={category.id}
                  >
                    <input
                      type="radio"
                      required
                      name="category"
                      value={category.id}
                      checked={draft.category === category.id}
                      onChange={() =>
                        setDraft((previous) => ({
                          ...previous,
                          category: category.id as HardwareCategory,
                        }))
                      }
                    />
                    <Icon size={25} aria-hidden="true" />
                    <span>{category.label}</span>
                  </label>
                );
              })}
            </div>
            {errors.category && (
              <p className="field-error" id="category-error">
                {errors.category}
              </p>
            )}
          </fieldset>
          <div className="form-section">
            <label className="field-label" htmlFor="part-type">
              Part Type{" "}
              <span className="required-mark" aria-hidden="true">
                *
              </span>
              <span className="sr-only"> required</span>
            </label>
            <select
              required
              id="part-type"
              value={type}
              disabled={!draft.category}
              aria-invalid={!!errors.partType}
              aria-describedby={errors.partType ? "part-type-error" : undefined}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  typesByCategory: {
                    ...previous.typesByCategory,
                    [previous.category]: event.target.value,
                  },
                }))
              }
            >
              <option value="">
                {draft.category
                  ? "Select a part type"
                  : "Select a category first"}
              </option>
              {availablePartTypes(draft.category).map((part) => (
                <option key={part.id} value={part.id}>
                  {part.label}
                </option>
              ))}
              <option value="other">Other</option>
              <option value="not-sure">Not Sure</option>
            </select>
            {errors.partType && (
              <p className="field-error" id="part-type-error">
                {errors.partType}
              </p>
            )}
            {definition && (
              <p className="field-hint">{definition.description}</p>
            )}
          </div>
          <MeasurementFields
            enabled={!!type}
            key={type}
            definition={definition}
            group={group}
            errors={errors}
            onChange={(next) =>
              setDraft((previous) => ({
                ...previous,
                measurementsByType: {
                  ...previous.measurementsByType,
                  [type]: next,
                },
              }))
            }
          />
          <section className="form-section" aria-labelledby="additional-title">
            <h2 id="additional-title" tabIndex={-1}>
              Additional Details <span className="optional">(optional)</span>
            </h2>
            <div className="details-fields">
              {(
                [
                  {
                    id: "manufacturer",
                    label: "Manufacturer / Brand",
                    placeholder: "Type any brand you can see",
                    max: 120,
                  },
                  {
                    id: "markings",
                    label: "Part Number / Markings",
                    placeholder: "Copy stamped numbers or letters exactly",
                    max: 200,
                  },
                  {
                    id: "finish",
                    label: "Color / Finish",
                    placeholder: "Describe the color or finish",
                    max: 100,
                  },
                ] as const
              ).map((field) => (
                <div key={field.id}>
                  <label className="field-label" htmlFor={field.id}>
                    {field.label}
                  </label>
                  <input
                    id={field.id}
                    value={draft[field.id]}
                    maxLength={field.max}
                    onChange={(event) =>
                      setDraft((previous) => ({
                        ...previous,
                        [field.id]: event.target.value,
                      }))
                    }
                    placeholder={field.placeholder}
                  />
                </div>
              ))}
            </div>
            {definition?.orientation && (
              <fieldset className="orientation-fieldset">
                <legend>Orientation</legend>
                <div className="inline-options">
                  {(["left", "right", "not-sure"] as const).map((value) => (
                    <label key={value}>
                      <input
                        type="radio"
                        name="orientation"
                        checked={draft.orientation === value}
                        onChange={() =>
                          setDraft((previous) => ({
                            ...previous,
                            orientation: value,
                          }))
                        }
                      />
                      {value === "not-sure"
                        ? "Not Sure"
                        : value === "left"
                          ? "Left"
                          : "Right"}
                    </label>
                  ))}
                </div>
                <Link
                  className="measurement-help"
                  href="/guides/measurements#orientation"
                >
                  How to record orientation
                </Link>
              </fieldset>
            )}
            <label className="field-label" htmlFor="problem">
              Description of the problem
            </label>
            <textarea
              id="problem"
              rows={3}
              maxLength={1500}
              value={draft.problem}
              onChange={(event) =>
                setDraft((previous) => ({
                  ...previous,
                  problem: event.target.value,
                }))
              }
              placeholder="What is broken or not working? Include which side you viewed."
            />
          </section>
          <div className="workflow-actions">
            <Link href={back} className="button button-secondary">
              Back
            </Link>
            <button
              type="submit"
              disabled={photoBusy}
              className="button button-primary"
            >
              Continue to Review
              <ArrowRight size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="field-hint">
            You can review and edit everything before the next step. No
            identification request is sent.
          </p>
        </form>
      )}
    </WorkflowShell>
  );
}
