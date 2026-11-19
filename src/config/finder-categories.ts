import { getPartType, partTypes } from "./part-types";
import type { HardwareCategory, IntakeDraft } from "@/types/intake";
// Presentation only: legacy category IDs, part IDs and catalog relationships stay unchanged.
export const finderCategories = [
  {
    id: "windows",
    label: "Windows",
    location: "window",
    fallback: "window-hardware",
  },
  {
    id: "patio",
    label: "Sliding Patio Doors",
    location: "sliding-patio-door",
    fallback: "door-hardware",
  },
  {
    id: "storm-screen",
    label: "Storm & Screen Doors",
    location: "storm-screen-door",
    fallback: "door-hardware",
  },
  { id: "not-sure", label: "Not Sure", location: "", fallback: "not-sure" },
] as const;
export type FinderCategory = (typeof finderCategories)[number]["id"];
export function finderPartTypes(id: string) {
  const group = finderCategories.find((c) => c.id === id);
  return !group
    ? []
    : group.id === "not-sure"
      ? partTypes
      : partTypes.filter((p) => p.locations.includes(group.location));
}
export function finderCategory(draft: IntakeDraft): FinderCategory | "" {
  if (!draft.category) return "";
  const type = draft.typesByCategory[draft.category] || "";
  if (draft.finderCategory) return draft.finderCategory;
  const definition = getPartType(type);
  return (
    finderCategories.find(
      (c) => c.location && definition?.locations.includes(c.location),
    )?.id ?? (draft.category.startsWith("window") ? "windows" : "not-sure")
  );
}
export function finderCategoryLabel(draft: IntakeDraft) {
  return (
    finderCategories.find((c) => c.id === finderCategory(draft))?.label ||
    "Not selected"
  );
}
export function chooseFinderCategory(
  draft: IntakeDraft,
  id: FinderCategory,
): IntakeDraft {
  const group = finderCategories.find((c) => c.id === id)!;
  const current = draft.typesByCategory[draft.category] || "";
  const previousGroup = finderCategory(draft);
  const history = {
    ...draft.typesByFinderCategory,
    ...(previousGroup ? { [previousGroup]: current } : {}),
  };
  const type = history[id] || "";
  const category = (getPartType(type)?.category ||
    group.fallback) as HardwareCategory;
  return {
    ...draft,
    finderCategory: id,
    typesByFinderCategory: history,
    category,
    typesByCategory: { ...draft.typesByCategory, [category]: type },
  };
}
export function chooseFinderType(
  draft: IntakeDraft,
  type: string,
): IntakeDraft {
  const group = finderCategory(draft);
  const category = getPartType(type)?.category || draft.category;
  return {
    ...draft,
    category,
    typesByCategory: { ...draft.typesByCategory, [category]: type },
    typesByFinderCategory: {
      ...draft.typesByFinderCategory,
      ...(group ? { [group]: type } : {}),
    },
  };
}
