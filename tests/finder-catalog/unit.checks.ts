import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanFinderInput,
  finderInput,
  searchEvidence,
  explainCandidate,
  nextMeasurement,
  type RankedHit,
} from "@/lib/finder-catalog/contract";
import { findCatalog } from "@/lib/finder-catalog/server";
import { emptyDraft } from "@/lib/intake";
import {
  chooseFinderCategory,
  chooseFinderType,
} from "@/config/finder-categories";
import { catalogRehearsalData } from "@/lib/catalog/rehearsal-data";
const draft = chooseFinderType(
  chooseFinderCategory(emptyDraft(), "windows"),
  "sash-cam-lock",
);
const input = () =>
  finderInput({
    ...draft,
    manufacturer: "Synthetic Maker",
    markings: "FIXTURE-MPN-001",
  });
const product = catalogRehearsalData().products[0],
  variant = product.variants[0];
const row: RankedHit = {
  tier: 0,
  normalized: true,
  alternate: false,
  brand_match: true,
  family_match: true,
  word_matches: [],
  hit: {
    product_id: product.id,
    variant_id: variant.id,
    slug: product.slug,
    title: product.title,
    description: product.description,
    manufacturer_id: product.manufacturer_id,
    manufacturer_name: "Synthetic Maker",
    family_id: "window-locks",
    category: "window-hardware",
    finish: "",
    verified_at: "2026-11-01",
    synthetic: false,
    numbers: [
      {
        id: variant.id,
        kind: "manufacturer",
        value: "FIXTURE-MPN-001",
        source_id: product.source_id,
        verified_at: product.verified_at,
      },
    ],
    offers: [],
    dimensions: [
      {
        id: variant.id,
        key: "hole-spacing",
        label: "Screw-hole spacing",
        value: 25.4,
        unit: "mm",
        source_id: product.source_id,
        verified_at: product.verified_at,
      },
    ],
    media: product.media,
  },
};
test("only explicit written fields leave the draft; photos, filenames, AI state and guide metadata are absent", () => {
  const value = finderInput({
    ...draft,
    problem: "Window lock keeper",
    markings: "FIXTURE-MPN-001",
    catalogSearchRequested: true,
  });
  assert.deepEqual(
    Object.keys(value).sort(),
    [
      "category",
      "description",
      "group",
      "manufacturer",
      "measurements",
      "number",
      "page",
      "partType",
    ].sort(),
  );
  assert.equal(value.measurements.length, 0);
  assert.throws(() =>
    cleanFinderInput({ ...value, photo: "data:image/png;base64,abc" }),
  );
  assert.throws(() =>
    cleanFinderInput({
      ...value,
      measurements: [
        { id: "invented", value: 1, unit: "mm", status: "provided" },
      ],
    }),
  );
  assert.throws(() => cleanFinderInput({ ...value, page: 20 }));
});
test("legacy part types map to catalog families without renaming identifiers or pretending balances have verified subtypes", () => {
  const balance = finderInput(
    chooseFinderType(
      chooseFinderCategory(emptyDraft(), "windows"),
      "spiral-balance",
    ),
  );
  const legacy = finderInput({
    ...emptyDraft(),
    category: "window-parts",
    typesByCategory: { "window-parts": "not-sure" },
  });
  assert.deepEqual(searchEvidence(legacy).families, ["balances"]);
  assert.equal(balance.partType, "spiral-balance");
  assert.equal(balance.category, "window-parts");
  assert.deepEqual(searchEvidence(balance).families, ["balances"]);
  const unknown = finderInput(
    chooseFinderType(
      chooseFinderCategory(emptyDraft(), "not-sure"),
      "not-sure",
    ),
  );
  assert.deepEqual(searchEvidence(unknown).families, []);
  assert.deepEqual(searchEvidence(unknown).words, []);
  const windows = finderInput(
    chooseFinderType(chooseFinderCategory(emptyDraft(), "windows"), "not-sure"),
  );
  assert.equal(searchEvidence(windows).families.length, 4);
});
test("exact manufacturer numbers and supplier SKUs have distinct truthful labels; alternate and normalized values never claim exact fit", () => {
  assert.equal(explainCandidate(row, input()).label, "Exact Part Number Found");
  const sku = {
    ...row,
    tier: 1,
    hit: {
      ...row.hit,
      numbers: [],
      offers: [
        {
          id: variant.id,
          supplier_id: variant.id,
          supplier_name: "Synthetic Supplier",
          sku: input().number,
          availability: "unknown" as const,
          source_id: product.source_id,
          verified_at: product.verified_at,
        },
      ],
    },
  };
  assert.equal(explainCandidate(sku, input()).label, "Supplier SKU Found");
  assert.equal(
    explainCandidate(
      { ...row, tier: 3 },
      { ...input(), number: "fixturempn001" },
    ).label,
    "Possible Match — Verify Measurements",
  );
  assert.ok(
    explainCandidate(row, input()).checks.some((v) =>
      v.includes("compatibility"),
    ),
  );
});
test("missing measurements never exclude candidates; comparison and one optional follow-up use only verified record keys", () => {
  const c = explainCandidate(row, input());
  assert.equal(nextMeasurement([c], input())?.id, "hole-spacing");
  const unknown = {
    ...input(),
    measurements: [
      {
        id: "hole-spacing",
        value: null,
        unit: "mm" as const,
        status: "unknown" as const,
      },
    ],
  };
  assert.equal(nextMeasurement([c], unknown), undefined);
  const provided = {
    ...input(),
    measurements: [
      {
        id: "hole-spacing",
        value: 2,
        unit: "in" as const,
        status: "provided" as const,
      },
    ],
  };
  assert.ok(
    explainCandidate(row, provided).checks.some((v) => v.includes("differs")),
  );
  assert.equal(searchEvidence(provided).measurements[0].value, 2);
});
test("media requires actual permission/source verification; long markings are not silently truncated into exact numbers", () => {
  const c = explainCandidate(
    {
      ...row,
      hit: {
        ...row.hit,
        media: row.hit.media.map((m) => ({
          ...m,
          permission: "pending" as const,
        })),
      },
    },
    input(),
  );
  assert.equal(c.hit.media.length, 0);
  const long = { ...input(), number: "x".repeat(81) };
  assert.equal(searchEvidence(long).number, "");
  assert.throws(() =>
    cleanFinderInput({ ...input(), manufacturer: "x".repeat(121) }),
  );
});
test("catalog connection disabled is distinct from an empty real catalog and never returns demonstration records", async () => {
  const prior = process.env.CATALOG_ENABLED;
  try {
    process.env.CATALOG_ENABLED = "false";
    const r = await findCatalog(input());
    assert.equal(r.state, "unavailable");
    assert.deepEqual(r.candidates, []);
  } finally {
    if (prior === undefined) delete process.env.CATALOG_ENABLED;
    else process.env.CATALOG_ENABLED = prior;
  }
});
