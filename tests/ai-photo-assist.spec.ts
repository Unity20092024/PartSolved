import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildAiHarness } from "./helpers/build-ai-harness.mjs";
const output = path.resolve("test-results", `ai-harness-${process.pid}`);
test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
  await buildAiHarness(output);
});
async function harness(page: Page) {
  await page.route("**/__ai-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>#ai-test-root>label{display:block}#ai-test-root input{max-width:100%}output{display:block;overflow-wrap:anywhere;font-size:12px}</style><link rel="stylesheet" href="/__ai-test.css"></head><body><main style="padding:12px;max-width:780px;margin:auto"><div id="ai-test-root"></div></main><script src="/__ai-test.js"></script></body></html>',
    }),
  );
  await page.route("**/__ai-test.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript; charset=utf-8",
      body: await readFile(path.join(output, "ai-harness.js")),
    }),
  );
  await page.route("**/__ai-test.css", async (route) =>
    route.fulfill({
      contentType: "text/css",
      body:
        (await readFile("src/app/globals.css", "utf8")).replace(
          '@import "tailwindcss";',
          "",
        ) +
        (await readFile(
          "src/components/part-finder/ai/photo-assist.css",
          "utf8",
        )),
    }),
  );
  await page.goto("/__ai-test");
}
const fixture = {
  analysis: {
    outcome: "possibilities",
    candidates: [
      {
        familyId: "rollers",
        evidence: [
          {
            photo: 1,
            observation: "Two wheels are visible inside a metal housing.",
          },
        ],
      },
    ],
    markings: [{ photo: 1, text: "A?12", certainty: "uncertain" }],
    followUp: "opposite-side",
  },
};
test("consent, compression, confirmation, rejection and navigation preserve manual details", async ({
  page,
}) => {
  let calls = 0;
  await page.route("**/api/hardware/analyze", async (route) => {
    calls++;
    expect(route.request().headers()["x-photo-consent"]).toBe("openai-v1");
    expect(route.request().postDataBuffer()!.byteLength).toBeLessThan(
      2300 * 1024,
    );
    await route.fulfill({ json: fixture });
  });
  await harness(page);
  await page.getByLabel("Manual markings").fill("MY MANUAL CODE");
  await page
    .getByLabel("Primary photo", { exact: true })
    .setInputFiles("tests/fixtures/color-swatch.jpg");
  const analyze = page.getByRole("button", {
    name: "Analyze Photo",
    exact: true,
  });
  await expect(analyze).toBeDisabled();
  await page.getByLabel("Select photo 1 for analysis").check();
  await expect(analyze).toBeDisabled();
  expect(calls).toBe(0);
  await page.getByLabel(/I agree to send/).check();
  await analyze.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("heading", { name: "Possible hardware families" }),
  ).toBeVisible();
  await expect(page.getByTestId("draft")).toContainText('"category":""');
  await page.getByRole("button", { name: "This Looks Similar" }).click();
  await expect(page.getByTestId("draft")).toContainText('"category":""');
  await page.getByRole("button", { name: "Confirm Family Choice" }).click();
  await expect(page.getByTestId("draft")).toContainText(
    '"category":"door-parts"',
  );
  await expect(page.getByTestId("draft")).toContainText(
    '"markings":"MY MANUAL CODE"',
  );
  await page.getByRole("button", { name: "Leave Photo Assist" }).click();
  await page.getByRole("button", { name: "Return to Photo Assist" }).click();
  await expect(
    page.getByRole("heading", { name: "Possible hardware families" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Not This One", exact: true }).click();
  await expect(page.getByTestId("assist-state")).toContainText("rollers");
  await expect(page.getByTestId("draft")).toContainText(
    '"markings":"MY MANUAL CODE"',
  );
  await page.getByRole("button", { name: "Unknown / None of These" }).click();
  await expect(
    page.getByRole("heading", { name: "Possible hardware families" }),
  ).toHaveCount(0);
  expect(calls).toBe(1);
});
test("three selected photos, unknown/error recovery, stale response and refresh privacy", async ({
  page,
}) => {
  await harness(page);
  const upload = page.getByLabel("Add a photo or follow-up view");
  await upload.setInputFiles([
    "tests/fixtures/color-swatch.jpg",
    "tests/fixtures/color-swatch.webp",
    "public/images/part-families/door-hinges.webp",
  ]);
  for (const i of [3, 1, 2])
    await page.getByLabel(`Select photo ${i} for analysis`).check();
  await expect(page.locator(".ai-photo-option").nth(2)).toContainText(
    "Analysis photo 1",
  );
  await page.getByLabel(/I agree to send/).check();
  await page.route("**/api/hardware/analyze", (route) =>
    route.fulfill({
      json: {
        analysis: {
          outcome: "unknown",
          candidates: [],
          markings: [],
          followUp: "clearer-photo",
        },
      },
    }),
  );
  await page
    .getByRole("button", { name: "Analyze Photo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unknown — more information is needed" }),
  ).toBeVisible();
  await page.unroute("**/api/hardware/analyze");
  await page.route("**/api/hardware/analyze", (route) =>
    route.fulfill({
      status: 429,
      json: { error: "The analysis allowance is reached. Continue manually." },
    }),
  );
  await page
    .getByRole("button", { name: "Analyze Photo", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("allowance");
  await expect(
    page.getByRole("button", { name: "Continue Without AI" }),
  ).toBeVisible();
  await page.unroute("**/api/hardware/analyze");
  let finish!: () => void;
  const delivered = new Promise<void>((resolve) => {
    finish = resolve;
  });
  await page.route("**/api/hardware/analyze", async (route) => {
    await new Promise((r) => setTimeout(r, 400));
    await route.fulfill({ json: fixture }).catch(() => {});
    finish();
  });
  const sent = page.waitForRequest((request) =>
    request.url().endsWith("/api/hardware/analyze"),
  );
  await page
    .getByRole("button", { name: "Analyze Photo", exact: true })
    .click();
  await sent;
  await page
    .getByLabel("Primary photo", { exact: true })
    .setInputFiles("tests/fixtures/color-swatch.webp");
  await delivered;
  await expect(
    page.getByRole("heading", { name: "Possible hardware families" }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByText("Select photo 1 for analysis", { exact: true }),
  ).toHaveCount(0);
});
test("public routes stay disabled; reviewer UI fits mobile widths", async ({
  page,
  request,
}, info) => {
  expect((await request.get("/find-part/ai-review")).status()).toBe(404);
  expect(
    (
      await request.post("/api/hardware/analyze", {
        headers: { origin: "http://127.0.0.1:3000" },
      })
    ).status(),
  ).toBe(403);
  await page.goto("/find-part/guided");
  await expect(
    page.getByRole("heading", { name: /AI Photo Assist/ }),
  ).toHaveCount(0);
  if (info.project.name === "mobile-chromium") return;
  await harness(page);
  await page
    .getByLabel("Primary photo", { exact: true })
    .setInputFiles("tests/fixtures/color-swatch.jpg");
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if ([375, 1280].includes(width))
      await page.screenshot({
        path: `artifacts/ai-photo-assist-${width}.png`,
        fullPage: true,
      });
  }
});

test("extra-only photo confirmation reaches usable intake and skipping AI keeps manual finder available", async ({
  page,
}) => {
  await page.route("**/api/hardware/analyze", (route) =>
    route.fulfill({ json: fixture }),
  );
  await harness(page);
  await page.getByRole("button", { name: "Continue Without AI" }).click();
  await expect(page.getByText(/Photo Assist skipped/)).toBeVisible();
  await page
    .getByRole("button", { name: "Show Optional Photo Assist" })
    .click();
  await page
    .getByLabel("Add a photo or follow-up view")
    .setInputFiles("public/images/part-families/patio-door-rollers.webp");
  await page.getByLabel("Select photo 1 for analysis").check();
  await page.getByLabel(/I agree to send/).check();
  await page
    .getByRole("button", { name: "Analyze Photo", exact: true })
    .click();
  await page.getByRole("button", { name: "This Looks Similar" }).click();
  await expect(
    page.getByText(/first selected photo will also be used/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Confirm Family Choice" }).click();
  await expect(page.getByTestId("primary-photo")).toHaveText(
    "patio-door-rollers.webp",
  );
  await expect(
    page.getByRole("link", { name: "Continue Without AI" }),
  ).toHaveAttribute("href", "/find-part/details");
});
test("unknown analysis can carry the chosen photo to Details without adopting a family", async ({
  page,
}) => {
  await page.route("**/api/hardware/analyze", (route) =>
    route.fulfill({
      json: {
        analysis: {
          outcome: "unknown",
          candidates: [],
          markings: [],
          followUp: "clearer-photo",
        },
      },
    }),
  );
  await harness(page);
  await page
    .getByLabel("Add a photo or follow-up view")
    .setInputFiles("tests/fixtures/color-swatch.jpg");
  await page.getByLabel("Select photo 1 for analysis").check();
  await page.getByLabel(/I agree to send/).check();
  await page
    .getByRole("button", { name: "Analyze Photo", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Unknown — more information is needed" }),
  ).toBeVisible();
  // Keep the test harness mounted while checking the actual link's handoff callback.
  await page.evaluate(() =>
    document.addEventListener(
      "click",
      (event) => {
        if (
          (event.target as HTMLElement).closest('a[href="/find-part/details"]')
        )
          event.preventDefault();
      },
      true,
    ),
  );
  await page
    .getByRole("link", { name: "Review Identification Details" })
    .click();
  await expect(page.getByTestId("primary-photo")).toHaveText(
    "color-swatch.jpg",
  );
  await expect(page.getByTestId("draft")).toContainText('"category":""');
});
