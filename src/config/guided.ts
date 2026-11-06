import { getPartType, partTypes } from "./part-types";
import type { GuidedAnswers, HardwareCategory } from "@/types/intake";
export const locations = [
  { id: "window", label: "Window" },
  { id: "sliding-patio-door", label: "Sliding Patio Door" },
  { id: "entry-door", label: "Entry Door" },
  { id: "storm-screen-door", label: "Storm / Screen Door" },
  { id: "not-sure", label: "Not Sure" },
];
export function purposes(location: string) {
  return [
    { id: "locks", label: "Locks or unlocks" },
    {
      id: "opens",
      label:
        location === "window"
          ? "Opens or closes the window"
          : "Opens or closes",
    },
    { id: "slides", label: "Helps something slide" },
    {
      id: "balances",
      label:
        location === "window"
          ? "Supports or balances the window"
          : "Supports or balances a window",
    },
    { id: "holds", label: "Holds something in place" },
    { id: "not-sure", label: "Not Sure" },
  ];
}
export function guidedTypes(answers: GuidedAnswers) {
  return partTypes.filter(
    (type) =>
      (answers.location === "not-sure" ||
        type.locations.includes(answers.location)) &&
      (answers.purpose === "not-sure" ||
        type.purposes.includes(answers.purpose)),
  );
}
export function guidedSuggestion(answers: GuidedAnswers): {
  category: HardwareCategory;
  partType: string;
  uncertain: boolean;
} {
  const selected = getPartType(answers.appearance);
  if (selected && guidedTypes(answers).some((type) => type.id === selected.id))
    return {
      category: selected.category,
      partType: selected.id,
      uncertain: false,
    };
  const candidates = guidedTypes(answers);
  const categories = new Set(candidates.map((type) => type.category));
  return {
    category: categories.size === 1 ? [...categories][0] : "not-sure",
    partType: answers.appearance === "other" ? "other" : "not-sure",
    uncertain: true,
  };
}
export function guidedValid(answers: GuidedAnswers, step: number) {
  return (
    [
      locations.some((item) => item.id === answers.location),
      purposes(answers.location).some((item) => item.id === answers.purpose),
      ["other", "not-sure"].includes(answers.appearance) ||
        !!getPartType(answers.appearance),
      ["measurements", "markings", "both", "not-sure"].includes(
        answers.information,
      ),
    ][step] ?? true
  );
}
export function guidedLabel(value: string) {
  return (
    locations.find((item) => item.id === value)?.label ??
    purposes("window").find((item) => item.id === value)?.label ??
    (value === "other"
      ? "Other"
      : value === "not-sure"
        ? "Not Sure"
        : (getPartType(value)?.label ?? "Not provided"))
  );
}
