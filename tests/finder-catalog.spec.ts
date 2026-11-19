import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const asset = "public/images/window-sash-lock.webp";
async function capture(page: Page, name: string, profile: string) {
  await mkdir("artifacts/finder-catalog/screenshots", { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.screenshot({
    path: `artifacts/finder-catalog/screenshots/${name}-${profile}.png`,
    fullPage: true,
    animations: "disabled",
  });
}
async function details(page: Page, profile?: string) {
  await page.goto("/");
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles(asset);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  if (profile) await capture(page, "photo", profile);
  await page.getByRole("link", { name: "Continue to Add Details" }).click();
}
async function choose(
  page: Page,
  { known = true, number = "SYN-MPN-001", brand = "LOCAL FIXTURE MAKER" } = {},
) {
  await page
    .getByRole("radio", { name: known ? "Windows" : "Not Sure", exact: true })
    .check();
  await page
    .locator("#part-type")
    .selectOption(known ? "sash-cam-lock" : "not-sure");
  await page.locator("#manufacturer").fill(brand);
  await page.locator("#markings").fill(number);
}
async function results(page: Page) {
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await page.getByRole("link", { name: "Search Catalog", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Catalog Results", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Searching catalog records…", { exact: true }),
  ).toHaveCount(0);
}
test("complete photo/review/catalog journey uses real anonymous database ranking, licensed images and pagination without photo transmission", async ({
  page,
}, info) => {
  const posts: unknown[] = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/api/finder/catalog") && r.method() === "POST")
      posts.push(r.postDataJSON());
  });
  await details(page, info.project.name);
  const camera = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Retake Photo", exact: true }).click();
  await (await camera).setFiles("tests/fixtures/color-swatch.jpg");
  const gallery = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Replace Photo", exact: true })
    .click();
  await (await gallery).setFiles(asset);
  await choose(page);
  await page.locator("#problem").fill("Keeper is loose");
  await capture(page, "details", info.project.name);
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await expect(
    page.getByText("No measurements added. You can continue without them."),
  ).toBeVisible();
  await capture(page, "review", info.project.name);
  await page.getByRole("link", { name: "Search Catalog", exact: true }).click();
  await expect(page.locator(".finder-candidate")).toHaveCount(3);
  const cards = page.locator(".finder-candidate");
  await expect(cards.nth(0)).toContainText("Exact Part Number Found");
  await expect(cards.nth(0)).toContainText("Sash lock 1");
  await expect(cards.nth(1)).toContainText("Supplier SKU Found");
  await expect(cards.nth(1)).toContainText("Sash lock 2");
  await expect(cards.nth(2)).toContainText("Sash lock 3");
  await expect(
    cards
      .nth(0)
      .getByRole("heading", { name: "What still needs verification" }),
  ).toBeVisible();
  await expect(page.locator(".finder-candidate-image")).toHaveCount(1);
  await expect
    .poll(() =>
      page
        .locator(".finder-candidate-image")
        .evaluate((e) => (e as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await capture(page, "results", info.project.name);
  await page.getByRole("button", { name: "View more candidates" }).click();
  await expect(cards).toHaveCount(4);
  await expect(cards.last()).toContainText("Sash lock 4");
  expect(posts.length).toBeGreaterThanOrEqual(2);
  for (const body of posts) {
    expect(Object.keys(body as object).sort()).toEqual(
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
    expect(JSON.stringify(body)).not.toMatch(
      /data:image|base64|\.webp|\.jpg|blob:/,
    );
  }
  await cards.first().getByRole("link", { name: "View Part Details" }).click();
  await expect(page).toHaveURL(/\/catalog\/finder-local-fixture-1\?variant=/);
  await expect(
    page.getByRole("heading", {
      name: "LOCAL FIXTURE — Sash lock 1",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.locator('a[href*="checkout"],a[href*="affiliate"]'),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Back to Finder Results", exact: true })
    .click();
  await expect(page).toHaveURL("/find-part/results");
  await expect
    .poll(() => page.locator(".finder-candidate").count())
    .toBeGreaterThanOrEqual(3);
  await page
    .getByRole("link", { name: "Update your details", exact: true })
    .click();
  await expect(page.locator("#markings")).toHaveValue("SYN-MPN-001");
  await expect(page.locator("#problem")).toHaveValue("Keeper is loose");
  await expect(page.getByAltText("Your selected part photo")).toBeVisible();
});
test("Not Sure, no-match and category discovery never fill missing results with drafts or demonstration products", async ({
  page,
  request,
  baseURL,
}) => {
  await details(page);
  await choose(page, { known: false, number: "NOT-IN-CATALOG", brand: "" });
  await results(page);
  await expect(
    page.getByText("We couldn't find a matching part in our catalog yet.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".finder-candidate")).toHaveCount(0);
  for (const name of [
    "Try another part number",
    "Update your details",
    "Browse related parts",
    "Read an identification guide",
  ])
    await expect(page.getByRole("link", { name, exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "Try another part number", exact: true })
    .click();
  await page.locator("#markings").fill("");
  await results(page);
  await expect(
    page.getByRole("heading", { name: "More Information Needed", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Update your details", exact: true })
    .click();
  await page.getByRole("radio", { name: "Windows", exact: true }).check();
  await page.locator("#part-type").selectOption("not-sure");
  await results(page);
  await expect(page.locator(".finder-candidate")).toHaveCount(3);
  await expect(page.locator(".finder-candidate-grid")).not.toContainText(
    "Exact Part Number Found",
  );
  for (const n of [6, 7])
    expect(
      (await request.get(`/catalog/finder-local-fixture-${n}`)).status(),
    ).toBe(404);
  const seed = JSON.parse(
    await readFile("artifacts/finder-catalog/local/seed.json", "utf8"),
  );
  expect(
    (await request.get(`/api/catalog/media/${seed.pending}`)).status(),
  ).toBe(404);
  const response = await request.post("/api/finder/catalog", {
    headers: { origin: baseURL! },
    data: {
      category: "not-sure",
      group: "not-sure",
      partType: "not-sure",
      manufacturer: "",
      number: "SYN-MPN-006",
      description: "",
      measurements: [],
      page: 0,
    },
  });
  expect(response.ok()).toBe(true);
  expect((await response.json()).candidates).toEqual([]);
});
test("only relevant verified measurements are requested; missing and I Don't Know never block candidates", async ({
  page,
}) => {
  await details(page);
  await choose(page, { known: true, number: "", brand: "LOCAL FIXTURE MAKER" });
  await results(page);
  await expect(page.locator(".finder-candidate")).toHaveCount(3);
  const question = page.locator(".catalog-measure-question");
  await question.locator("summary").click();
  await expect(
    question.getByRole("img", {
      name: /Measure between mounting-hole centers/,
    }),
  ).toBeVisible();
  await expect(question.getByRole("textbox")).toHaveCount(1);
  await page.locator("#candidate-measure").fill("1/0");
  await question.getByRole("button", { name: "Update candidates" }).click();
  await expect(question.getByRole("alert")).toContainText(
    "positive measurement",
  );
  await expect(page.locator(".finder-candidate")).toHaveCount(3);
  await question.getByRole("checkbox", { name: "I Don't Know" }).check();
  await question.getByRole("button", { name: "Update candidates" }).click();
  await expect(page.locator(".finder-candidate")).toHaveCount(3);
  await expect(page.locator(".catalog-measure-question")).toHaveCount(0);
  await page
    .getByRole("link", { name: "Update your details", exact: true })
    .click();
  await page.locator("details[name=measurements] > summary").click();
  await expect(
    page
      .locator(".measurement-field")
      .filter({ has: page.locator("#measure-hole-spacing") })
      .getByRole("checkbox", { name: "Unknown" }),
  ).toBeChecked();
});
test("provided millimeters rank equivalent catalog inches without inventing a value or overriding exact identifiers", async ({
  page,
}) => {
  await details(page);
  await choose(page, { known: true, number: "", brand: "LOCAL FIXTURE MAKER" });
  await results(page);
  const q = page.locator(".catalog-measure-question");
  await q.locator("summary").click();
  await page.locator("#candidate-unit").selectOption("mm");
  await page.locator("#candidate-measure").fill("25.4");
  await q.getByRole("button", { name: "Update candidates" }).click();
  await expect(page.locator(".catalog-measure-question")).toHaveCount(0);
  await expect(page.locator(".finder-candidate").first()).toContainText(
    "SYN-MPN-001",
  );
  await page
    .getByRole("link", { name: "Update your details", exact: true })
    .click();
  await page.locator("details[name=measurements] > summary").click();
  await expect(page.locator("#measure-hole-spacing")).toHaveValue("25.4");
  await expect(
    page.getByRole("combobox", { name: "Measurement units" }),
  ).toHaveValue("mm");
});
test("API is bounded, anonymous, uncached and refuses images, invalid measurements and cross-site requests", async ({
  request,
  baseURL,
}) => {
  const data = {
    category: "window-hardware",
    group: "windows",
    partType: "sash-cam-lock",
    manufacturer: "",
    number: "SYN-MPN-001",
    description: "",
    measurements: [],
    page: 0,
  };
  const good = await request.post("/api/finder/catalog", {
    headers: { origin: baseURL! },
    data,
  });
  expect(good.status()).toBe(200);
  const withCookie = await request.post("/api/finder/catalog", {
    headers: {
      origin: baseURL!,
      cookie: "sb-access-token=synthetic-untrusted-session",
    },
    data: {
      ...data,
      group: "not-sure",
      category: "not-sure",
      partType: "not-sure",
      number: "SYN-MPN-006",
    },
  });
  expect(withCookie.status()).toBe(200);
  expect((await withCookie.json()).candidates).toEqual([]);
  expect(good.headers()["cache-control"]).toContain("no-store");
  expect(good.headers()["x-robots-tag"]).toContain("noindex");
  expect(
    (
      await request.post("/api/finder/catalog", {
        headers: { origin: "https://attacker.invalid" },
        data,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/finder/catalog", {
        headers: { origin: baseURL! },
        data: { ...data, photo: "data:image/png;base64,abc" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/finder/catalog", {
        headers: { origin: baseURL! },
        data: {
          ...data,
          measurements: [
            { id: "hole-spacing", value: -1, unit: "mm", status: "provided" },
          ],
        },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/finder/catalog", {
        headers: { origin: baseURL!, "content-type": "image/png" },
        data: "fake-image",
      })
    ).status(),
  ).toBe(415);
  expect(
    (
      await request.post("/api/finder/catalog", {
        headers: { origin: baseURL! },
        data: { ...data, description: "x".repeat(9000) },
      })
    ).status(),
  ).toBe(413);
});
test("errors recover without fake records, responsive results fit mobile, and refresh/Find Another Part clear browser-only intake", async ({
  page,
}) => {
  let first = true;
  await page.route("**/api/finder/catalog", (route) => {
    if (first) {
      first = false;
      return route.fulfill({
        status: 503,
        json: { error: "Local simulated catalog interruption" },
      });
    }
    return route.continue();
  });
  await details(page);
  await choose(page);
  await results(page);
  await expect(page.locator(".workflow-page").getByRole("alert")).toContainText(
    "Local simulated catalog interruption",
  );
  await expect(page.locator(".finder-candidate")).toHaveCount(0);
  await page.getByRole("button", { name: "Try search again" }).click();
  await expect(page.locator(".finder-candidate")).toHaveCount(3);
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("SYN-MPN");
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Find Another Part", exact: true })
    .click();
  await expect(page).toHaveURL(/\/#photo-upload$/);
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles(asset);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await page.getByRole("link", { name: "Continue to Add Details" }).click();
  await expect(page.locator("#markings")).toHaveValue("");
  await choose(page);
  await results(page);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your photo is no longer available" }),
  ).toBeVisible();
  await expect(page.locator(".finder-candidate")).toHaveCount(0);
});
