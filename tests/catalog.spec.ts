import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import {
  buildCatalogHarness,
  buildCatalogParser,
} from "./helpers/build-catalog-harness.mjs";
const output = path.resolve("test-results", `catalog-ui-${process.pid}`);
test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
  await Promise.all([buildCatalogHarness(output), buildCatalogParser(output)]);
});
async function rehearsal(page: Page) {
  await page.route("**/__catalog-rehearsal", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/__catalog.css"></head><body><div id="catalog-test-root"></div><script src="/__catalog.js"></script></body></html>',
    }),
  );
  await page.route("**/__catalog.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: await readFile(path.join(output, "catalog-harness.js")),
    }),
  );
  await page.route("**/__catalog.css", async (route) =>
    route.fulfill({
      contentType: "text/css",
      body: (
        await Promise.all(
          ["src/app/globals.css", "src/app/catalog/catalog.css"].map((p) =>
            readFile(p, "utf8"),
          ),
        )
      ).join("\n"),
    }),
  );
  await page.goto("/__catalog-rehearsal");
  await expect(
    page.getByRole("heading", { name: "Catalog foundation rehearsal" }),
  ).toBeVisible();
  page.on("dialog", (dialog) => dialog.accept());
}
async function admin(page: Page) {
  await page
    .getByRole("button", { name: "Catalog administration", exact: true })
    .click();
}
async function importFile(page: Page, name = "synthetic-import.csv") {
  await page
    .getByRole("button", { name: "Import & batches", exact: true })
    .click();
  await page
    .getByLabel("Import file", { exact: true })
    .setInputFiles("tests/fixtures/catalog/" + name);
  await page.getByRole("button", { name: "Read file & map columns" }).click();
  await page
    .getByRole("combobox", { name: "Import source", exact: true })
    .selectOption("e1000000-0000-4000-8000-000000000004");
  await page
    .getByRole("button", { name: "Validate mappings & duplicates" })
    .click();
}
test("number search, two supplier SKUs, candidates, no match and product preview stay honest", async ({
  page,
}) => {
  await rehearsal(page);
  const input = page.getByLabel("Part number or supplier SKU");
  await input.fill("DEMO-MPN-001");
  await page
    .locator(".catalog-filters")
    .getByRole("button", { name: "Search catalog", exact: true })
    .click();
  await expect(page.locator(".catalog-product-card")).toHaveCount(1);
  await expect(page.locator(".catalog-match-label")).toHaveText(
    "Exact verified number",
  );
  await expect(page.locator(".catalog-product-card")).toContainText(
    "DEMO-B-001",
  );
  await input.fill("demompn001");
  await page
    .locator(".catalog-filters")
    .getByRole("button", { name: "Search catalog", exact: true })
    .click();
  await expect(page.locator(".catalog-match-label")).toHaveText(
    "Normalized number candidate",
  );
  await input.fill("DEMO-B-001");
  await page
    .locator(".catalog-filters")
    .getByRole("button", { name: "Search catalog", exact: true })
    .click();
  await expect(page.locator(".catalog-product-card")).toHaveCount(1);
  await page.getByRole("button", { name: "View record", exact: false }).click();
  await expect(
    page.getByRole("heading", {
      name: "Synthetic roller assembly — rehearsal only",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Compatibility documentation" }),
  ).toBeVisible();
  await expect(
    page.getByText(/No verified compatibility information/),
  ).toBeVisible();
  await expect(page.getByText("Supplier SKU:", { exact: false })).toHaveCount(
    2,
  );
  await expect(page.locator(".catalog-gallery img").first()).toBeVisible();
  await expect(
    page.getByRole("link", { name: /buy|checkout|order now/i }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Back to rehearsal search", exact: false })
    .click();
  await input.fill("NO-VERIFIED-MATCH");
  await page
    .locator(".catalog-filters")
    .getByRole("button", { name: "Search catalog", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No verified match", exact: true }),
  ).toBeVisible();
});
test("administrator can add/edit variants and preserve unknown details while synthetic publication stays disabled", async ({
  page,
}) => {
  await rehearsal(page);
  await admin(page);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await page.getByRole("button", { name: "Save product draft" }).click();
  await expect(page.getByRole("status").last()).toContainText("required");
  await page
    .getByLabel("Product title", { exact: true })
    .fill("SYNTHETIC new catalog draft");
  await page
    .getByLabel("Product URL slug", { exact: true })
    .fill("synthetic-new-draft");
  await page
    .locator(".catalog-editor-fields")
    .getByRole("combobox", { name: "Manufacturer", exact: true })
    .selectOption("e1000000-0000-4000-8000-000000000001");
  await page
    .getByRole("button", { name: "+ Add variant", exact: true })
    .click();
  await page.getByRole("button", { name: "Save product draft" }).click();
  await expect(page.getByRole("status").last()).toContainText("browser memory");
  await expect(
    page.getByRole("button", { name: "Publish product", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Catalog records", exact: false })
    .click();
  await page
    .locator(".catalog-admin-records article")
    .filter({ hasText: "SYNTHETIC new catalog draft" })
    .getByRole("button", { name: "Edit product" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Variant 2", exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Product title", { exact: true })
    .fill("SYNTHETIC edited draft");
  await page.getByRole("button", { name: "Save product draft" }).click();
  await page.getByRole("button", { name: "Preview product" }).click();
  await expect(
    page.getByRole("heading", { name: "SYNTHETIC edited draft", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No verified dimensions have been recorded."),
  ).toBeVisible();
});
test("CSV mapped import groups two offers, exports drafts, rejects existing duplicates and safely rolls back", async ({
  page,
}) => {
  await rehearsal(page);
  await admin(page);
  await importFile(page);
  await expect(
    page.getByText(
      "2 source rows · 1 products · 1 variants · 2 supplier offers",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import draft batches", exact: true })
    .click();
  await expect(page.getByRole("status").last()).toContainText("browser memory");
  await expect(page.locator(".catalog-batches li")).toHaveCount(1);
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(page.locator(".catalog-admin-records article")).toHaveCount(3);
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export records", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toContain("catalog-export");
  await importFile(page);
  await expect(page.getByRole("status").last()).toContainText("already exists");
  await page
    .getByRole("button", { name: "Roll back untouched drafts", exact: true })
    .click();
  await expect(page.locator(".catalog-batches")).toContainText("rolled_back");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await expect(page.locator(".catalog-admin-records article")).toHaveCount(2);
});
test("image permissions require review, support upload/revocation, and keep purchasing disabled", async ({
  page,
}) => {
  await rehearsal(page);
  await admin(page);
  await page
    .locator(".catalog-admin-records article")
    .filter({ hasText: "Synthetic window lock" })
    .getByRole("button", { name: "Edit product" })
    .click();
  await page
    .getByLabel("Image alt text", { exact: true })
    .fill("Synthetic authorized upload fixture");
  await page
    .getByLabel("Permission / rights reference", { exact: true })
    .fill("Owned local test swatch — not manufacturer media");
  await page
    .getByLabel("Choose authorized image")
    .setInputFiles("tests/fixtures/color-swatch.jpg");
  await page
    .getByLabel("I am authorized to upload this image for catalog review.")
    .check();
  await page.getByRole("button", { name: "Upload private image" }).click();
  await expect(page.locator(".catalog-media-card")).toContainText("pending");
  await page.getByRole("button", { name: "Preview product" }).click();
  await expect(page.locator(".catalog-gallery img")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Back to editing", exact: false })
    .click();
  await page
    .getByLabel("Media permission verification source")
    .selectOption("e1000000-0000-4000-8000-000000000004");
  await page
    .getByLabel("Media permission verification date (UTC)")
    .fill("2026-11-01");
  await page.getByRole("button", { name: "Approve authorized media" }).click();
  await expect(page.locator(".catalog-media-card")).toContainText("approved");
  await page.getByRole("button", { name: "Preview product" }).click();
  await expect(page.locator(".catalog-gallery img").first()).toBeVisible();
  await page
    .getByRole("button", { name: "Back to editing", exact: false })
    .click();
  await page.getByRole("button", { name: "Revoke permission" }).click();
  await expect(page.locator(".catalog-media-card")).toContainText("revoked");
  await page.getByRole("button", { name: "Preview product" }).click();
  await expect(page.locator(".catalog-gallery img")).toHaveCount(0);
});
test("catalog search, product and administrator layouts fit phone/tablet/desktop widths with keyboard controls", async ({
  page,
}) => {
  await rehearsal(page);
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/catalog-search-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/catalog-search-desktop.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "View record", exact: false })
    .first()
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", {
      name: "Synthetic roller assembly — rehearsal only",
      exact: true,
    }),
  ).toBeVisible();
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/catalog-product-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/catalog-product-desktop.png",
    fullPage: true,
  });
  await admin(page);
  await page
    .locator(".catalog-admin-records article")
    .first()
    .getByRole("button", { name: "Edit product" })
    .click();
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/catalog-editor-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/catalog-editor-desktop.png",
    fullPage: true,
  });
});
test("public routes never expose rehearsal fixtures, drafts, purchasing links or unauthorized mutations", async ({
  page,
  request,
  baseURL,
}) => {
  const response = await page.goto("/catalog");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "No verified match", exact: true }),
  ).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  expect((await request.get("/catalog/synthetic-rehearsal-1")).status()).toBe(
    404,
  );
  expect((await request.get("/admin/catalog/rehearsal")).status()).toBe(404);
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "synthetic",
  );
  for (const endpoint of [
    "/api/catalog/manage",
    "/api/catalog/import",
    "/api/catalog/media",
  ]) {
    expect(
      (
        await request.post(endpoint, {
          headers: { origin: "https://attacker.invalid" },
        })
      ).status(),
    ).toBe(403);
    const own = await request.post(endpoint, {
      headers: { origin: baseURL! },
      data: { action: "save" },
    });
    expect([401, 403, 503]).toContain(own.status());
  }
});

test("XLSX field mapping uses the real bounded parser and remains draft-only", async ({
  page,
}) => {
  const require = createRequire(path.resolve("package.json")),
    { spreadsheet } = require(path.join(output, "catalog-parser.cjs"));
  await rehearsal(page);
  await admin(page);
  await page.route("**/api/catalog/import", async (route) => {
    expect(route.request().headers()["x-import-format"]).toBe("xlsx");
    const sheet = await spreadsheet(route.request().postDataBuffer(), "xlsx");
    await route.fulfill({ json: { sheet, file_hash: "local-test-fixture" } });
  });
  await importFile(page, "synthetic-import.xlsx");
  await expect(
    page.getByText(
      "2 source rows · 1 products · 1 variants · 2 supplier offers",
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Import draft batches", exact: true })
    .click();
  await expect(page.locator(".catalog-batches")).toContainText("committed");
  await page.getByRole("button", { name: "Products", exact: true }).click();
  await page
    .locator(".catalog-admin-records article")
    .filter({ hasText: "SYNTHETIC imported roller" })
    .getByRole("button", { name: "Edit product" })
    .click();
  await expect(
    page.getByRole("button", { name: "Publish product", exact: true }),
  ).toBeDisabled();
  await expect(page.getByLabel("Supplier SKU", { exact: true })).toHaveCount(2);
});
test("duplicate source rows and invalid dimensions block the entire import plan", async ({
  page,
}) => {
  await rehearsal(page);
  await admin(page);
  await page
    .getByRole("button", { name: "Import & batches", exact: true })
    .click();
  const source = await readFile(
    "tests/fixtures/catalog/synthetic-import.csv",
    "utf8",
  );
  const invalid = source + source.split("\n")[1] + "\n";
  await page
    .getByLabel("Import file", { exact: true })
    .setInputFiles({
      name: "synthetic-duplicates.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(invalid),
    });
  await page.getByRole("button", { name: "Read file & map columns" }).click();
  await page
    .getByRole("combobox", { name: "Import source", exact: true })
    .selectOption("e1000000-0000-4000-8000-000000000004");
  await page
    .getByRole("button", { name: "Validate mappings & duplicates" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Duplicate row");
  await expect(
    page.getByRole("button", { name: "Import draft batches", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Import file", { exact: true })
    .setInputFiles({
      name: "synthetic-invalid-dimension.csv",
      mimeType: "text/csv",
      buffer: Buffer.from(source.replaceAll(",1,in,", ",-1,in,")),
    });
  await page.getByRole("button", { name: "Read file & map columns" }).click();
  await page
    .getByRole("button", { name: "Validate mappings & duplicates" })
    .click();
  await expect(page.getByRole("alert")).toContainText("positive decimal");
  await expect(
    page.getByRole("button", { name: "Import draft batches", exact: true }),
  ).toHaveCount(0);
});
