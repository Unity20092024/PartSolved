import { families, familyById } from "@/config/assistance";
import type { AssistanceState, FamilySuggestion } from "@/types/assistance";
import type { IntakeDraft } from "@/types/intake";

// Intake triage only. These rules do not establish a diagnosis or compatibility.
export function suggestFamilies(answers: AssistanceState): FamilySuggestion[] {
  const suggestions: FamilySuggestion[] = [];
  const add = (id: string, reason: string) => {
    const family = familyById(id);
    if (
      family &&
      !answers.rejected.includes(id) &&
      !suggestions.some((item) => item.family.id === id)
    )
      suggestions.push({ family, reason });
  };
  answers.similar.forEach((id) =>
    add(
      id,
      "You selected this family as looking similar. This still needs verification.",
    ),
  );
  const { location, symptom, area, stuck } = answers;
  if (location === "window") {
    if (symptom === "wont-stay")
      add(
        "balances",
        "A window that will not stay open may have a worn or disconnected balance.",
      );
    if (symptom === "wont-lock" || area === "lock")
      add(
        "window-locks",
        "You described a window locking problem or pointed to its lock. Alignment can also be the cause.",
      );
    if (symptom === "handle-spins" || area === "handle")
      add(
        "operators",
        "A crank problem may involve an operator if this is an outward-swinging window.",
      );
    if (
      area === "side" &&
      ["hard-slide", "wont-open", "broken"].includes(symptom)
    )
      add(
        "balances",
        "A problem at the side of a movable window may involve its balance or fittings.",
      );
  }
  if (location === "sliding-patio-door") {
    if (["hard-slide", "scraping"].includes(symptom) || area === "bottom") {
      add(
        "rollers",
        stuck === "bottom" || area === "bottom"
          ? "Dragging near the bottom may involve the rollers; track debris or alignment can cause the same symptom."
          : "Difficulty sliding can involve rollers, but also track condition or door alignment.",
      );
      if (stuck === "handle")
        add(
          "patio-locks",
          "A latch that does not fully retract may catch near the handle.",
        );
    }
    if (symptom === "wont-lock" || area === "lock") {
      add(
        "patio-locks",
        "A patio door locking problem may involve the edge lock or keeper alignment.",
      );
      add(
        "handles",
        "The handle or linkage may also prevent the lock from operating.",
      );
    }
    if (symptom === "handle-spins" || area === "handle") {
      add("handles", "The handle may be loose or disconnected.");
      add(
        "patio-locks",
        "The internal lock or connecting linkage may also be involved.",
      );
    }
  }
  if (location === "entry-door") {
    if (
      symptom === "wont-lock" ||
      symptom === "handle-spins" ||
      ["handle", "lock"].includes(area)
    )
      add(
        "handles",
        "A hinged-door handle, latch or lockset may need checking, along with the strike alignment.",
      );
    if (["scraping", "wont-close"].includes(symptom) || area === "side")
      add(
        "hinges",
        "Hinge wear or loose fasteners may let a door sag and rub. Frame alignment can also be the cause.",
      );
  }
  if (location === "storm-screen-door") {
    if (symptom === "wont-close" || area === "top")
      add(
        "closers",
        "A closer or its mounting brackets may affect how a storm door closes.",
      );
    if (
      symptom === "wont-lock" ||
      symptom === "handle-spins" ||
      area === "handle"
    )
      add(
        "screen-latches",
        "The latch or keeper may be involved in a storm or screen door latching problem.",
      );
    if (symptom === "scraping" || area === "side")
      add("hinges", "Hinge wear or alignment may cause a screen door to rub.");
  }
  return suggestions.slice(0, 3);
}
export function adoptFamily(
  draft: IntakeDraft,
  familyId: string,
  description: string,
): IntakeDraft {
  const family = familyById(familyId);
  if (!family) return draft;
  return {
    ...draft,
    source: "guided",
    category: family.category,
    typesByCategory: {
      ...draft.typesByCategory,
      [family.category]: family.partType,
    },
    problem: draft.problem || description,
  };
}
export function orderedFamilies(answers: AssistanceState) {
  const suggested = suggestFamilies(answers).map((item) => item.family);
  return [
    ...suggested,
    ...families.filter(
      (item) => !suggested.some((candidate) => candidate.id === item.id),
    ),
  ];
}
