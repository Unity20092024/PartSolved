import { families } from "@/config/assistance";
import { finderCategories } from "@/config/finder-categories";
import {
  getPartType,
  hardwareCategories,
  partTypes,
} from "@/config/part-types";
import { buildIdentificationIntake, emptyGuided } from "@/lib/intake";
import {
  CatalogError,
  dimensionMm,
  exactPartNumber,
  type CatalogHit,
} from "@/lib/catalog/model";
import type { IntakeDraft } from "@/types/intake";
export const familyByType: Readonly<Record<string, string>> = {
  "spiral-balance": "balances",
  "channel-balance": "balances",
  "casement-operator": "operators",
  "sash-cam-lock": "window-locks",
  "track-fin-lock": "track-fin-locks",
  "patio-mortise-lock": "patio-locks",
  "patio-handle-set": "handles",
  "patio-roller": "rollers",
  "storm-closer": "closers",
  "push-button-latch": "screen-latches",
};
const groupFamilies: Record<string, string[]> = {
  windows: ["balances", "window-locks", "operators", "track-fin-locks"],
  patio: ["rollers", "patio-locks", "handles"],
  "storm-screen": ["closers", "screen-latches", "hinges"],
  "not-sure": [],
};
export type FinderInput = {
  category: string;
  partType: string;
  group: string;
  manufacturer: string;
  number: string;
  description: string;
  measurements: {
    id: string;
    value: number | null;
    unit: "in" | "mm";
    status: "provided" | "unknown";
  }[];
  page: number;
};
const fields = [
  "category",
  "partType",
  "group",
  "manufacturer",
  "number",
  "description",
  "measurements",
  "page",
];
export function cleanFinderInput(raw: unknown): FinderInput {
  if (!raw || typeof raw !== "object" || Array.isArray(raw))
    throw new CatalogError("Send written identification details only.");
  const o = raw as Record<string, unknown>;
  if (Object.keys(o).some((k) => !fields.includes(k)))
    throw new CatalogError(
      "Send written identification details only; photos are not accepted.",
    );
  const str = (key: string, max: number) => {
    const v = o[key] ?? "";
    if (typeof v !== "string" || v.length > max)
      throw new CatalogError("Shorten the written search details.");
    return v.trim();
  };
  const category = str("category", 40),
    partType = str("partType", 50),
    group = str("group", 30);
  if (
    !hardwareCategories.some((c) => c.id === category) ||
    ![...partTypes.map((p) => p.id), "other", "not-sure"].includes(partType) ||
    !finderCategories.some((c) => c.id === group)
  )
    throw new CatalogError("Choose a category and part type, or Not Sure.");
  const page = o.page ?? 0;
  if (!Number.isSafeInteger(page) || Number(page) < 0 || Number(page) > 19)
    throw new CatalogError("Choose a valid results page.");
  if (!Array.isArray(o.measurements) || o.measurements.length > 20)
    throw new CatalogError("Use known measurement prompts only.");
  const seen = new Set<string>();
  const measurements = o.measurements.map((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new CatalogError("Review the measurements.");
    const m = value as Record<string, unknown>;
    if (
      Object.keys(m).some(
        (k) => !["id", "value", "unit", "status"].includes(k),
      ) ||
      typeof m.id !== "string" ||
      !getPartType(partType)?.measurements.some((f) => f.id === m.id) ||
      seen.has(m.id) ||
      !["in", "mm"].includes(String(m.unit))
    )
      throw new CatalogError("Use known measurement prompts only.");
    seen.add(m.id);
    if (m.status === "unknown" && m.value === null)
      return {
        id: m.id,
        value: null,
        unit: m.unit as "in" | "mm",
        status: "unknown" as const,
      };
    if (
      m.status !== "provided" ||
      typeof m.value !== "number" ||
      !Number.isFinite(m.value) ||
      m.value <= 0 ||
      m.value > 1000000
    )
      throw new CatalogError(
        "Enter a positive measurement or choose I Don't Know.",
      );
    return {
      id: m.id,
      value: m.value,
      unit: m.unit as "in" | "mm",
      status: "provided" as const,
    };
  });
  return {
    category,
    partType,
    group,
    manufacturer: str("manufacturer", 120),
    number: str("number", 200),
    description: str("description", 1500),
    measurements,
    page: Number(page),
  };
}
export function finderInput(draft: IntakeDraft): FinderInput {
  const intake = buildIdentificationIntake(draft, emptyGuided());
  return cleanFinderInput({
    category: intake.category,
    partType: intake.partType,
    group: draft.finderCategory || "not-sure",
    manufacturer: intake.manufacturer,
    number: intake.markings,
    description: intake.problem,
    measurements: intake.measurements
      .filter((m) => m.status !== "missing")
      .map(({ id, value, unit, status }) => ({ id, value, unit, status })),
    page: 0,
  });
}
export function searchEvidence(input: FinderInput) {
  const family = familyByType[input.partType];
  const familyIds = family
    ? [family]
    : groupFamilies[input.group]?.length
      ? groupFamilies[input.group]
      : input.category !== "not-sure"
        ? families.filter((f) => f.category === input.category).map((f) => f.id)
        : [];
  const stop = new Set([
    "the",
    "and",
    "but",
    "for",
    "with",
    "this",
    "that",
    "not",
    "won",
    "does",
    "doesn",
    "don",
    "have",
    "has",
    "when",
    "what",
    "there",
    "something",
    "broken",
    "problem",
    "sure",
    "unknown",
    "part",
    "photo",
    "please",
    "help",
  ]);
  const words = [
    ...new Set(input.description.toLowerCase().match(/[a-z]{3,30}/g) || []),
  ]
    .filter((w) => !stop.has(w))
    .slice(0, 8);
  const number = input.number.length <= 80 ? input.number : "";
  return {
    number,
    brand: input.manufacturer,
    families: familyIds,
    words,
    measurements: input.measurements
      .filter((m) => m.status === "provided")
      .map((m) => ({ key: m.id, value: m.value, unit: m.unit })),
  };
}
export type RankedHit = {
  hit: CatalogHit;
  tier: number;
  normalized: boolean;
  alternate: boolean;
  brand_match: boolean;
  family_match: boolean;
  word_matches: string[];
};
export type FinderCandidate = {
  hit: CatalogHit;
  label: string;
  reasons: string[];
  checks: string[];
};
export type FinderResponse = {
  state: "ready" | "unavailable";
  candidates: FinderCandidate[];
  total: number;
  page: number;
  needsInformation: boolean;
  numberNeedsClarification: boolean;
};
export function explainCandidate(
  row: RankedHit,
  input: FinderInput,
): FinderCandidate {
  const h = row.hit,
    reasons: string[] = [],
    checks = [
      "Confirm dimensions, mounting details and compatibility in manufacturer documentation before ordering.",
    ];
  const verified = (v: {
    source_id: string | null;
    verified_at: string | null;
  }) => !!v.source_id && !!v.verified_at;
  const exactMpns = h.numbers.filter(
    (n) =>
      verified(n) &&
      n.kind === "manufacturer" &&
      exactPartNumber(n.value) === exactPartNumber(input.number),
  );
  const exactSkus = h.offers.filter(
    (n) =>
      verified(n) && exactPartNumber(n.sku) === exactPartNumber(input.number),
  );
  let label = "Possible Match — Verify Measurements";
  if (row.tier === 0 && exactMpns.length) {
    label = "Exact Part Number Found";
    reasons.push(
      "Your entered number exactly matches a verified manufacturer part number on this record.",
    );
  } else if (row.tier === 1 && exactSkus.length) {
    label = "Supplier SKU Found";
    reasons.push(
      `Your entered number matches a verified supplier SKU: ${exactSkus.map((o) => `${o.supplier_name || "Recorded supplier"} · ${o.sku}`).join(", ")}.`,
    );
  } else if (row.normalized)
    reasons.push(
      "A verified identifier matches after punctuation is removed. Confirm every character; punctuation can matter.",
    );
  else if (row.alternate)
    reasons.push(
      "A documented alternate identifier has the same text. Confirm what that identifier refers to; it is not proof of interchangeability.",
    );
  if (row.brand_match)
    reasons.push("The manufacturer name matches your entered brand.");
  if (row.family_match)
    reasons.push(
      "This record is in a hardware family related to your selected category or part type.",
    );
  if (row.word_matches.length)
    reasons.push(
      `Catalog text contains: ${row.word_matches.join(", ")}. Text overlap is not a diagnosis.`,
    );
  if (input.number && !exactMpns.length && !exactSkus.length)
    checks.push(
      "Your entered part number is not verified as this record's manufacturer number or supplier SKU.",
    );
  if (input.manufacturer && !row.brand_match)
    checks.push(
      "Your entered manufacturer has not been confirmed for this record.",
    );
  if (searchEvidence(input).families.length && !row.family_match)
    checks.push(
      "This identifier belongs to a different hardware family from your selected details; recheck the part type.",
    );
  checks.push(
    "Confirm the specific part type and orientation; a catalog family may include several types.",
  );
  const definition = getPartType(input.partType);
  for (const d of h.dimensions.filter(verified)) {
    const entered = input.measurements.find((m) => m.id === d.key);
    if (
      entered?.status === "provided" &&
      entered.value !== null &&
      Math.abs(
        dimensionMm(entered.value, entered.unit) - dimensionMm(d.value, d.unit),
      ) > 1e-6
    )
      checks.push(
        `Your ${d.label.toLowerCase()} differs from the catalog reference. Check the units and reference points.`,
      );
    else if (definition?.measurements.some((m) => m.id === d.key) && !entered)
      checks.push(
        `${d.label} has not been provided. Compare the same reference points.`,
      );
  }
  // Never forward arbitrary media URLs, draft files or permission-pending records.
  return {
    hit: {
      ...h,
      media: h.media.filter(
        (m) =>
          m.kind === "photo" &&
          m.permission === "approved" &&
          m.state === "ready" &&
          verified(m) &&
          !!m.rights_reference,
      ),
    },
    label,
    reasons,
    checks: [...new Set(checks)],
  };
}
export function nextMeasurement(
  candidates: FinderCandidate[],
  input: FinderInput,
) {
  const definition = getPartType(input.partType);
  return definition?.measurements
    .map((prompt) => ({
      prompt,
      values: new Set(
        candidates.flatMap((c) =>
          c.hit.dimensions
            .filter((d) => d.key === prompt.id && d.source_id && d.verified_at)
            .map((d) => dimensionMm(d.value, d.unit)),
        ),
      ),
    }))
    .filter(
      ({ prompt, values }) =>
        values.size && !input.measurements.some((m) => m.id === prompt.id),
    )
    .sort((a, b) => b.values.size - a.values.size)[0]?.prompt;
}
