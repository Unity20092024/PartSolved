import { families, familyById } from "@/config/assistance";
import type { IntakeDraft } from "@/types/intake";

export const familyIds = families.map((family) => family.id);
export interface AssistCandidate {
  familyId: string;
  evidence: { photo: number; observation: string }[];
}
export interface AssistResult {
  outcome: "possibilities" | "unknown";
  candidates: AssistCandidate[];
  markings: {
    photo: number;
    text: string;
    certainty: "uncertain" | "unreadable";
  }[];
  followUp:
    | "whole-installation"
    | "opposite-side"
    | "markings-close-up"
    | "clearer-photo"
    | "none";
}
export const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["outcome", "candidates", "markings", "followUp"],
  properties: {
    outcome: { type: "string", enum: ["possibilities", "unknown"] },
    candidates: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["familyId", "evidence"],
        properties: {
          familyId: { type: "string", enum: familyIds },
          evidence: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: {
              type: "object",
              additionalProperties: false,
              required: ["photo", "observation"],
              properties: {
                photo: { type: "integer", minimum: 1, maximum: 3 },
                observation: { type: "string", maxLength: 200 },
              },
            },
          },
        },
      },
    },
    markings: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["photo", "text", "certainty"],
        properties: {
          photo: { type: "integer", minimum: 1, maximum: 3 },
          text: { type: "string", maxLength: 80 },
          certainty: { type: "string", enum: ["uncertain", "unreadable"] },
        },
      },
    },
    followUp: {
      type: "string",
      enum: [
        "whole-installation",
        "opposite-side",
        "markings-close-up",
        "clearer-photo",
        "none",
      ],
    },
  },
} as const;

const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const exact = (v: Record<string, unknown>, keys: string[]) =>
  Object.keys(v).length === keys.length && keys.every((k) => k in v);
const text = (v: unknown, max: number): v is string =>
  typeof v === "string" &&
  v.trim().length > 0 &&
  v.length <= max &&
  !/[\u0000-\u0008\u000b-\u001f]/.test(v);
const photo = (v: unknown, count: number) =>
  Number.isInteger(v) && Number(v) >= 1 && Number(v) <= count;
export function validateAnalysis(v: unknown, count: number): AssistResult {
  const invalid = () => {
    throw new Error("Invalid analysis response");
  };
  if (
    !object(v) ||
    !exact(v, ["outcome", "candidates", "markings", "followUp"])
  )
    return invalid();
  if (
    !["possibilities", "unknown"].includes(String(v.outcome)) ||
    !Array.isArray(v.candidates) ||
    v.candidates.length > 3 ||
    !Array.isArray(v.markings) ||
    v.markings.length > 3
  )
    return invalid();
  if ((v.outcome === "unknown") !== (v.candidates.length === 0))
    return invalid();
  const seen = new Set();
  for (const c of v.candidates) {
    if (
      !object(c) ||
      !exact(c, ["familyId", "evidence"]) ||
      typeof c.familyId !== "string" ||
      !familyIds.includes(c.familyId) ||
      seen.has(c.familyId) ||
      !Array.isArray(c.evidence) ||
      c.evidence.length < 1 ||
      c.evidence.length > 3
    )
      return invalid();
    seen.add(c.familyId);
    for (const e of c.evidence) {
      if (
        !object(e) ||
        !exact(e, ["photo", "observation"]) ||
        !photo(e.photo, count) ||
        !text(e.observation, 200)
      )
        return invalid();
      // Reject purchase/compatibility/dimension claims even inside evidence prose.
      if (
        /(?:[$€£%]|\b(?:sku|compatible|compatibility|guaranteed|exact replacement|in stock|price|manufacturer|brand)\b|\b\d+(?:[./]\d+)?\s*(?:mm|cm|inches|inch|in\b)|\d\s*["″])/i.test(
          e.observation,
        )
      )
        return invalid();
    }
  }
  for (const m of v.markings)
    if (
      !object(m) ||
      !exact(m, ["photo", "text", "certainty"]) ||
      !photo(m.photo, count) ||
      !text(m.text, 80) ||
      !["uncertain", "unreadable"].includes(String(m.certainty))
    )
      return invalid();
  if (
    !analysisSchema.properties.followUp.enum.includes(
      v.followUp as AssistResult["followUp"],
    )
  )
    return invalid();
  return v as unknown as AssistResult;
}

// Only customer-confirmed category/type choices change. Preserve every manual field,
// including the per-type measurement groups for previously selected types.
export function confirmFamily(
  draft: IntakeDraft,
  familyId: string,
): IntakeDraft {
  const family = familyById(familyId);
  if (!family) return draft;
  return {
    ...draft,
    category: family.category,
    typesByCategory: {
      ...draft.typesByCategory,
      [family.category]: family.partType,
    },
  };
}
