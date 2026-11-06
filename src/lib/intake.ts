import { guidedSuggestion } from "@/config/guided";
import {
  availablePartTypes,
  getPartType,
  hardwareCategories,
} from "@/config/part-types";
import type {
  GuidedAnswers,
  IdentificationIntake,
  IntakeDraft,
  MeasurementGroup,
  Unit,
} from "@/types/intake";
export const emptyDraft = (): IntakeDraft => ({
  source: "photo",
  category: "",
  typesByCategory: {},
  measurementsByType: {},
  manufacturer: "",
  markings: "",
  guidedMarkingsApplied: "",
  finish: "",
  orientation: "not-sure",
  problem: "",
});
export const emptyGuided = (): GuidedAnswers => ({
  step: 0,
  location: "",
  purpose: "",
  appearance: "",
  information: "",
  measurementNotes: "",
  markings: "",
  completed: false,
});
export const emptyMeasurements = (): MeasurementGroup => ({
  unit: "in",
  values: {},
  notes: "",
});
export function selectedType(draft: IntakeDraft) {
  return draft.typesByCategory[draft.category] ?? "";
}
export function parseMeasurement(value: string, unit: Unit): number | null {
  const text = value.trim();
  let number: number;
  if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(text)) number = Number(text);
  else if (unit === "in" && /^(?:\d+\s+)?\d+\/\d+$/.test(text)) {
    const [wholeOrFraction, fraction] = text.split(/\s+/);
    const [numerator, denominator] = (fraction ?? wholeOrFraction)
      .split("/")
      .map(Number);
    if (!denominator) return null;
    number = (fraction ? Number(wholeOrFraction) : 0) + numerator / denominator;
  } else return null;
  return Number.isFinite(number) && number > 0 ? number : null;
}
export function validateDraft(draft: IntakeDraft): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!hardwareCategories.some((category) => category.id === draft.category))
    errors.category = "Choose a hardware category, or select Not Sure.";
  const type = selectedType(draft);
  if (
    !["other", "not-sure"].includes(type) &&
    !availablePartTypes(draft.category).some((item) => item.id === type)
  )
    errors.partType = "Choose a part type, Other, or Not Sure.";
  const group = draft.measurementsByType[type] ?? emptyMeasurements();
  for (const field of getPartType(type)?.measurements ?? []) {
    const answer = group.values[field.id];
    if (
      answer &&
      !answer.unknown &&
      answer.value.trim() &&
      parseMeasurement(answer.value, group.unit) === null
    )
      errors[field.id] =
        group.unit === "in"
          ? "Enter a positive decimal or fraction, such as 1.5 or 1 1/2, or choose Unknown."
          : "Enter a positive decimal in millimeters, or choose Unknown.";
  }
  return errors;
}
export function convertGroup(
  group: MeasurementGroup,
  unit: Unit,
): MeasurementGroup | null {
  if (unit === group.unit) return group;
  const values: MeasurementGroup["values"] = {};
  for (const [id, answer] of Object.entries(group.values)) {
    if (!answer.value.trim()) {
      values[id] = answer;
      continue;
    }
    const number = parseMeasurement(answer.value, group.unit);
    if (number === null) return null;
    else
      values[id] = {
        ...answer,
        value: (unit === "mm" ? number * 25.4 : number / 25.4).toLocaleString(
          "en-US",
          { useGrouping: false, maximumSignificantDigits: 12 },
        ),
      };
  }
  return { ...group, unit, values };
}
export function buildIdentificationIntake(
  draft: IntakeDraft,
  guided: GuidedAnswers,
): IdentificationIntake {
  if (Object.keys(validateDraft(draft)).length)
    throw new Error(
      "Complete or correct the intake before creating an identification request.",
    );
  const partType = selectedType(draft),
    definition = getPartType(partType),
    group = draft.measurementsByType[partType] ?? emptyMeasurements();
  return {
    schemaVersion: 1,
    category: draft.category as IdentificationIntake["category"],
    partType,
    measurements: (definition?.measurements ?? []).map((field) => {
      const answer = group.values[field.id];
      return {
        id: field.id,
        enteredValue: answer?.unknown ? "" : (answer?.value.trim() ?? ""),
        value:
          answer && !answer.unknown
            ? parseMeasurement(answer.value, group.unit)
            : null,
        unit: group.unit,
        status: answer?.unknown
          ? "unknown"
          : answer?.value.trim()
            ? "provided"
            : "missing",
      };
    }),
    measurementNotes: group.notes,
    manufacturer: draft.manufacturer,
    markings: draft.markings,
    finish: draft.finish,
    orientation: definition?.orientation ? draft.orientation : "not-sure",
    problem: draft.problem,
    ...(guided.completed
      ? {
          guidedAnswers: {
            location: guided.location,
            purpose: guided.purpose,
            appearance: guided.appearance,
            information: guided.information,
            measurementNotes: ["measurements", "both"].includes(
              guided.information,
            )
              ? guided.measurementNotes
              : "",
            markings: ["markings", "both"].includes(guided.information)
              ? guided.markings
              : "",
          },
        }
      : {}),
  };
}

// Update values previously copied from Guided Finder, but never overwrite a later manual correction.
export function applyGuidedAnswers(
  draft: IntakeDraft,
  guided: GuidedAnswers,
): IntakeDraft {
  const suggestion = guidedSuggestion(guided);
  const incoming = ["markings", "both"].includes(guided.information)
    ? guided.markings
    : "";
  const canUpdate =
    !draft.markings.trim() || draft.markings === draft.guidedMarkingsApplied;
  return {
    ...draft,
    source: "guided",
    category: suggestion.category,
    typesByCategory: {
      ...draft.typesByCategory,
      [suggestion.category]: suggestion.partType,
    },
    markings: canUpdate ? incoming : draft.markings,
    guidedMarkingsApplied: canUpdate ? incoming : draft.guidedMarkingsApplied,
  };
}
