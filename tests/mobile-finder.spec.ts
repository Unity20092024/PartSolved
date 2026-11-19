import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import {
  finderCategories,
  finderPartTypes,
  finderCategory,
  chooseFinderCategory,
  chooseFinderType,
} from "../src/config/finder-categories";
import { partTypes } from "../src/config/part-types";
import {
  emptyDraft,
  selectedType,
  validateDraft,
  buildIdentificationIntake,
  emptyGuided,
  applyGuidedAnswers,
} from "../src/lib/intake";
import { measurementGuidance } from "../src/lib/measurement-guidance";
const fixture = "public/images/window-sash-lock.webp";
async function photoToDetails(
  page: Page,
  screenshotName?: string,
  photoFile = fixture,
) {
  await page.goto("/");
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles(photoFile);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  if (screenshotName) {
    await mkdir("artifacts/mobile-finder", { recursive: true });
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    await page.screenshot({
      animations: "disabled",
      path: `artifacts/mobile-finder/photo-${screenshotName}.png`,
      fullPage: true,
    });
  }
  await page.getByRole("link", { name: "Continue to Add Details" }).click();
  await expect(
    page.getByRole("heading", { name: "Tell Us What You Know" }),
  ).toBeVisible();
}
test("friendly categories retain every legacy part/catalog ID, history and unknown measurements", () => {
  expect(finderCategories.map((c) => c.label)).toEqual([
    "Windows",
    "Sliding Patio Doors",
    "Storm & Screen Doors",
    "Not Sure",
  ]);
  for (const part of partTypes) {
    const legacy = {
      ...emptyDraft(),
      category: part.category,
      typesByCategory: { [part.category]: part.id },
    };
    expect(
      finderPartTypes(finderCategory(legacy)).some((p) => p.id === part.id),
    ).toBe(true);
    expect(validateDraft(legacy)).toEqual({});
    const request = buildIdentificationIntake(legacy, emptyGuided());
    expect(request.partType).toBe(part.id);
    expect(request.category).toBe(part.category);
    expect(
      request.measurements.every(
        (m) => m.status === "missing" && m.value === null,
      ),
    ).toBe(true);
  }
  let draft = chooseFinderType(
    chooseFinderCategory(emptyDraft(), "windows"),
    "channel-balance",
  );
  draft = {
    ...draft,
    problem: "Won't stay open",
    manufacturer: "Customer brand",
  };
  draft = chooseFinderType(
    chooseFinderCategory(draft, "patio"),
    "patio-roller",
  );
  expect(draft.category).toBe("door-parts");
  draft = chooseFinderCategory(draft, "windows");
  expect(selectedType(draft)).toBe("channel-balance");
  expect(draft.problem).toBe("Won't stay open");
  const guided = applyGuidedAnswers(draft, {
    ...emptyGuided(),
    location: "not-sure",
    purpose: "not-sure",
    appearance: "not-sure",
    information: "not-sure",
    completed: true,
  });
  expect(guided.finderCategory).toBeUndefined();
  expect(guided.manufacturer).toBe("Customer brand");
  const guidance = measurementGuidance("patio-roller", ["roller-diameter"]);
  expect(guidance?.prompts[0].visualGuideHref).toBe(
    "/guides/measurements#roller-diameter",
  );
  expect(guidance?.canChooseUnknown).toBe(true);
  expect(
    measurementGuidance("patio-roller", ["invented-dimension"]),
  ).toBeNull();
});
test("photo to next steps needs no measurements, preserves answers and photo controls", async ({
  page,
}, info) => {
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() === "POST") posts.push(r.url());
  });
  await photoToDetails(page);
  await expect(
    page.locator('details[name="measurements"]'),
  ).not.toHaveAttribute("open");
  await expect(
    page.getByText(/provisional identification prompts/),
  ).not.toBeVisible();
  await page.getByRole("radio", { name: "Windows", exact: true }).check();
  await page.locator("#part-type").selectOption("sash-cam-lock");
  await expect(
    page.locator('#part-type option[value="casement-operator"]'),
  ).toHaveCount(1);
  await page.locator("#problem").fill("The window won't lock");
  await page.locator("#markings").fill("Customer marking");
  const camera = page.getByLabel("Take a photo of your part", { exact: true });
  await expect(camera).toHaveAttribute("capture", "environment");
  const capture = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Retake Photo", exact: true }).click();
  await (await capture).setFiles("tests/fixtures/color-swatch.jpg");
  await expect(page.locator("figcaption")).toHaveText("color-swatch.jpg");
  const gallery = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Replace Photo", exact: true })
    .click();
  await (await gallery).setFiles(fixture);
  await page.getByRole("button", { name: "Remove Photo", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your photo is no longer available" }),
  ).toBeVisible();
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles(fixture);
  await expect(page.locator("#problem")).toHaveValue("The window won't lock");
  await expect(
    page.locator('details[name="measurements"]'),
  ).not.toHaveAttribute("open");
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await expect(
    page.getByRole("heading", { name: "Review & Continue", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("No measurements added. You can continue without them."),
  ).toBeVisible();
  await expect(page.locator(".missing-information")).not.toContainText(
    "Metal channel length",
  );
  await expect(
    page.getByText("Customer marking", { exact: true }),
  ).toBeVisible();
  await mkdir("artifacts/mobile-finder", { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.screenshot({
    animations: "disabled",
    path: `artifacts/mobile-finder/review-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Back to Add Details", exact: true })
    .click();
  await expect(page.locator("#part-type")).toHaveValue("sash-cam-lock");
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.locator("#part-type").selectOption("not-sure");
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await page.getByRole("link", { name: "Continue to Next Steps" }).click();
  await expect(
    page.getByRole("heading", { name: "Your Next Steps" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Use Guided Finder/ }),
  ).toBeVisible();
  expect(posts).toEqual([]);
});
test("Android Facebook user-agent supports the same local flow and mobile disclosures without overflow", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/490.0.0.0.0;]",
    baseURL: "http://127.0.0.1:3200",
  });
  const page = await context.newPage();
  try {
    await photoToDetails(
      page,
      info.project.name,
      "public/images/part-families/storm-door-closer.webp",
    );
    await page
      .getByRole("radio", { name: "Storm & Screen Doors", exact: true })
      .check();
    await page.locator("#part-type").selectOption("storm-closer");
    await expect(
      page.locator('#part-type option[value="patio-roller"]'),
    ).toHaveCount(0);
    await page.locator("#problem").fill("The door won't close");
    for (const width of [320, 375, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await mkdir("artifacts/mobile-finder", { recursive: true });
    await page.locator("h1").click();
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    await page.screenshot({
      animations: "disabled",
      path: `artifacts/mobile-finder/details-${info.project.name}.png`,
      fullPage: true,
    });
    const summary = page.locator('details[name="measurements"] > summary');
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#measure-body-length")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Measurement units" })
      .selectOption("mm");
    await page.locator("#measure-body-length").fill("125");
    await summary.click();
    await page.getByRole("button", { name: "Continue to Review" }).click();
    await expect(page.getByText("125 mm", { exact: true })).toBeVisible();
    await page
      .getByRole("link", { name: "Add or edit measurements", exact: true })
      .click();
    await expect(page.locator("#measure-body-length")).toBeVisible();
    await expect(page.locator("#measure-body-length")).toHaveValue("125");
  } finally {
    await context.close();
  }
});
