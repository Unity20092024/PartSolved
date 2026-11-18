import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  cleanProduct,
  normalizePartNumber,
  approvedPurchasingUrl,
} from "@/lib/catalog/model";
import { catalogRehearsalData } from "@/lib/catalog/rehearsal-data";
import { csvSheet, planImport, defaultMapping } from "@/lib/catalog/imports";
import { spreadsheet, inspectWorkbook } from "@/lib/catalog/spreadsheets";
import {
  classifyHit,
  filterHits,
  searchFilters,
  safeCsv,
} from "@/lib/catalog/search";
import {
  catalogEnabled,
  catalogWritesEnabled,
  assertCatalogOrigin,
} from "@/lib/catalog/server";
import { RehearsalCatalogPort } from "@/components/admin/catalog/rehearsal-port";
const data = catalogRehearsalData(),
  source = data.collections.sources[0].id;
const csv = readFileSync("tests/fixtures/catalog/synthetic-import.csv", "utf8");
test("manufacturer numbers and multiple supplier SKUs remain distinct; missing and invalid details fail", () => {
  const p = cleanProduct(data.products[0]);
  assert.equal(p.variants[0].offers.length, 2);
  assert.notEqual(p.variants[0].numbers[0].value, p.variants[0].offers[0].sku);
  for (const update of [
    { title: "" },
    { slug: "Invalid Slug" },
    { family_id: "not-a-family" },
  ])
    assert.throws(() => cleanProduct({ ...p, ...update }));
  const bad = structuredClone(p);
  bad.variants[0].dimensions[0].value = -1;
  assert.throws(() => cleanProduct(bad));
  bad.variants[0].dimensions[0].value = 25.4;
  bad.variants[0].dimensions[0].verified_at = "2999-01-01";
  assert.throws(() => cleanProduct(bad));
  assert.equal(normalizePartNumber(" Ab-001 / x "), "AB001X");
});
test("exact, normalized and partial candidates never imply compatibility; synthetic data requires private rehearsal", () => {
  const p = data.products[0],
    v = p.variants[0],
    hit = {
      product_id: p.id,
      variant_id: v.id,
      slug: p.slug,
      title: p.title,
      description: p.description,
      manufacturer_id: p.manufacturer_id,
      manufacturer_name: p.manufacturer_name || "",
      family_id: p.family_id,
      category: "door-parts",
      finish: v.finish,
      verified_at: v.verified_at!,
      synthetic: true,
      numbers: v.numbers,
      offers: v.offers,
      dimensions: v.dimensions,
      media: p.media,
    };
  assert.equal(classifyHit(hit, "DEMO-MPN-001"), "exact-identifier");
  assert.equal(classifyHit(hit, "demompn001"), "normalized-candidate");
  assert.equal(classifyHit(hit, "MPN"), "possible-candidate");
  assert.equal(
    filterHits([hit], searchFilters(new URLSearchParams())).length,
    0,
  );
  assert.equal(
    filterHits([hit], searchFilters(new URLSearchParams("q=DEMO-B-001")), true)
      .length,
    1,
  );
  assert.equal(
    filterHits([hit], searchFilters(new URLSearchParams("q=NO-MATCH")), true)
      .length,
    0,
  );
  assert.equal(
    filterHits(
      [hit],
      searchFilters(
        new URLSearchParams(
          "measurement=screw-spacing&min=1&max=1&unit=in&finish=Test+finish+A",
        ),
      ),
      true,
    ).length,
    1,
  );
  assert.throws(() =>
    searchFilters(new URLSearchParams("min=-1&measurement=screw-spacing")),
  );
  assert.throws(() => searchFilters(new URLSearchParams("mode=partial&q=A")));
  assert.throws(() => searchFilters(new URLSearchParams("page=99999")));
  const unverified = {
    ...hit,
    numbers: hit.numbers.map((n) => ({ ...n, verified_at: null })),
    offers: [],
  };
  assert.notEqual(classifyHit(unverified, "DEMO-MPN-001"), "exact-identifier");
});
test("CSV mapping groups one manufacturer variant across two suppliers and creates drafts only", () => {
  const sheet = csvSheet(csv),
    plan = planImport(
      sheet,
      defaultMapping(sheet.headers),
      data.collections,
      source,
      true,
    );
  assert.equal(plan.errors.length, 0);
  assert.equal(plan.products.length, 1);
  assert.equal(plan.products[0].revision, 0);
  assert.equal(plan.products[0].synthetic, true);
  assert.equal(plan.products[0].variants.length, 1);
  assert.equal(plan.products[0].variants[0].numbers.length, 1);
  assert.equal(plan.products[0].variants[0].offers.length, 2);
  const duplicated = csvSheet(csv + csv.split("\n")[1] + "\n");
  assert.match(
    planImport(
      duplicated,
      defaultMapping(duplicated.headers),
      data.collections,
      source,
      true,
    ).errors[0].message,
    /Duplicate row/,
  );
  const invalid = csvSheet(csv.replaceAll(",1,in,", ",-1,in,"));
  assert.ok(
    planImport(
      invalid,
      defaultMapping(invalid.headers),
      data.collections,
      source,
      true,
    ).errors.length,
  );
  assert.throws(() => planImport(sheet, {}, data.collections, source, true));
  assert.equal(
    csvSheet('a,b\r\n"multi\nline","quoted ""text"""').rows[0][1],
    'quoted "text"',
  );
  assert.throws(() => csvSheet('a\n"unterminated'));
});
test("XLSX parsing preserves text identifiers and rejects formulas, sparse ranges and unsupported files", async () => {
  const sheet = await spreadsheet(
    readFileSync("tests/fixtures/catalog/synthetic-import.xlsx"),
    "xlsx",
  );
  assert.equal(sheet.rows[0][6], "DEMO-IMPORT-MPN-011");
  assert.equal(
    planImport(
      sheet,
      defaultMapping(sheet.headers),
      data.collections,
      source,
      true,
    ).errors.length,
    0,
  );
  for (const file of ["reject-formula.xlsx", "reject-sparse-range.xlsx"])
    assert.throws(() =>
      inspectWorkbook(readFileSync("tests/fixtures/catalog/" + file)),
    );
  const inconsistent = Buffer.from(
    readFileSync("tests/fixtures/catalog/synthetic-import.xlsx"),
  );
  inconsistent.writeUInt16LE(0, 8);
  assert.throws(() => inspectWorkbook(inconsistent));
  await assert.rejects(spreadsheet(new Uint8Array([1, 2, 3]), "xls"));
  assert.throws(() => inspectWorkbook(Buffer.alloc(4 * 1024 * 1024)));
  const numeric = { ...sheet, numericCells: ["2:6"] };
  assert.match(
    planImport(
      numeric,
      defaultMapping(numeric.headers),
      data.collections,
      source,
      true,
    ).errors[0].message,
    /must be text/,
  );
});
test("purchasing URL validation never enables test checkouts or cross-host destinations; spreadsheet exports neutralize formulas", () => {
  assert.equal(
    approvedPurchasingUrl(
      "https://supplier.example/checkout",
      "https://supplier.example",
    ),
    null,
  );
  assert.equal(
    approvedPurchasingUrl(
      "https://test.supplier.example/part",
      "https://supplier.example",
    ),
    null,
  );
  assert.equal(
    approvedPurchasingUrl(
      "https://evil.example/part",
      "https://supplier.example",
    ),
    null,
  );
  assert.equal(
    approvedPurchasingUrl(
      "https://supplier.example/part/123",
      "https://supplier.example",
    ),
    "https://supplier.example/part/123",
  );
  assert.match(safeCsv([["=cmd()", "+evil", "normal"]]), /"'=cmd\(\)"/);
});
test("connection and write flags fail closed independently of the blog; mutation origins are exact", () => {
  const env = { ...process.env };
  try {
    delete process.env.CATALOG_ENABLED;
    delete process.env.CATALOG_WRITES_ENABLED;
    assert.equal(catalogEnabled(), false);
    assert.equal(catalogWritesEnabled(), false);
    process.env.CATALOG_ADMIN_ORIGIN = "https://preview.example";
    assert.doesNotThrow(() =>
      assertCatalogOrigin(
        new Request("https://preview.example/api/catalog/manage", {
          headers: { origin: "https://preview.example" },
        }),
      ),
    );
    for (const origin of ["null", "https://attacker.example"])
      assert.throws(() =>
        assertCatalogOrigin(
          new Request("https://preview.example/api/catalog/manage", {
            headers: { origin },
          }),
        ),
      );
    assert.throws(() =>
      assertCatalogOrigin(
        new Request("https://attacker.example/api/catalog/manage", {
          headers: { origin: "https://preview.example" },
        }),
      ),
    );
  } finally {
    process.env = env;
  }
});
test("rehearsal mutations, retry, export and rollback are real browser-memory operations with publication barred", async () => {
  const port = new RehearsalCatalogPort(data),
    sheet = csvSheet(csv),
    plan = await port.preview(
      sheet,
      defaultMapping(sheet.headers),
      data.collections,
      source,
      true,
    );
  const batch = crypto.randomUUID();
  await port.commit(plan.products, batch, source, true);
  await port.commit(plan.products, batch, source, true);
  assert.equal(port.allProducts().length, 3);
  await port.rollback(batch);
  assert.equal(port.allProducts().length, 2);
  const plan2 = await port.preview(
      sheet,
      defaultMapping(sheet.headers),
      data.collections,
      source,
      true,
    ),
    batch2 = crypto.randomUUID();
  await port.commit(plan2.products, batch2, source, true);
  const p = await port.load(plan2.products[0].id);
  p.title += " edited";
  await port.save(p);
  await assert.rejects(port.rollback(batch2));
  await assert.rejects(port.transition(await port.load(p.id), "published"));
  assert.equal((await port.export(0)).products.length, 3);
  port.dispose();
});
