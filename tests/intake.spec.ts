import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import {
  parseMeasurement,
  convertGroup,
  emptyDraft,
  validateDraft,
  buildIdentificationIntake,
  emptyGuided,
} from "../src/lib/intake";
const fixture = path.resolve("public/images/window-sash-lock.webp");
async function openDetails(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles(fixture);
  await expect(page.getByAltText("Your selected part photo")).toBeVisible();
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL("/find-part/preview");
  await page.getByRole("link", { name: "Continue to Add Details" }).click();
  await expect(page).toHaveURL("/find-part/details");
}
async function chooseOperator(page: Page) {
  await page
    .getByRole("radio", { name: "Window Hardware", exact: true })
    .check();
  await page
    .getByRole("combobox", { name: /Part Type/ })
    .selectOption("casement-operator");
}
async function detailsToReview(page: Page) {
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await expect(page).toHaveURL("/find-part/review");
}

test("supported JPEG and WebP decode, camera cancel preserves the selected photo", async ({
  page,
}) => {
  await page.goto("/");
  for (const extension of ["jpg", "webp"]) {
    await page
      .getByLabel("Upload a photo of your part", { exact: true })
      .setInputFiles(path.resolve(`tests/fixtures/color-swatch.${extension}`));
    await expect(page.locator("figcaption")).toHaveText(
      `color-swatch.${extension}`,
    );
    await expect(page.getByAltText("Your selected part photo")).toBeVisible();
  }
  await page
    .getByLabel("Take a photo of your part", { exact: true })
    .dispatchEvent("cancel");
  await expect(
    page.getByRole("status").filter({ hasText: "Selection canceled" }),
  ).toBeVisible();
  await expect(page.locator("figcaption")).toHaveText("color-swatch.webp");
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles({
      name: "unsupported.gif",
      mimeType: "image/gif",
      buffer: Buffer.from("GIF89a"),
    });
  await expect(page.locator("#photo-error")).toContainText(
    "format is not supported",
  );
  await expect(page.locator("figcaption")).toHaveText("color-swatch.webp");
});

test("empty required choices, invalid fractions, unknown values and keyboard error focus", async ({
  page,
}) => {
  await openDetails(page);
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await expect(page.locator(".error-summary")).toBeFocused();
  await expect(page.locator(".error-summary")).toContainText("select Not Sure");
  await page
    .getByRole("radio", { name: "Window Hardware", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("radio", { name: "Window Hardware", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("combobox", { name: /Part Type/ })
    .selectOption("casement-operator");
  await page.locator("#measure-arm-length").fill("1/0");
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await expect(page.locator("#measure-arm-length")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator(".error-summary")).toBeFocused();
  const unknown = page
    .locator(".measurement-field")
    .filter({ has: page.locator("#measure-arm-length") })
    .getByRole("checkbox", { name: "Unknown" });
  await unknown.check();
  await expect(page.locator("#measure-arm-length")).toBeDisabled();
  await detailsToReview(page);
  await expect(page.getByText("Unknown", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Missing or unknown information" }),
  ).toBeVisible();
});

test("dynamic category/type options and measurement state survive changes and back navigation", async ({
  page,
}) => {
  await openDetails(page);
  await chooseOperator(page);
  await page.locator("#measure-arm-length").fill("5 1/2");
  await page
    .locator("#measurement-notes")
    .fill("Pivot to pivot, viewed from inside");
  await page
    .getByLabel("Manufacturer / Brand", { exact: true })
    .fill("Visible brand");
  await page.getByRole("radio", { name: "Door Parts", exact: true }).check();
  await expect(page.getByRole("combobox", { name: /Part Type/ })).toHaveValue(
    "",
  );
  await expect(
    page.locator('#part-type option[value="casement-operator"]'),
  ).toHaveCount(0);
  await page
    .getByRole("combobox", { name: /Part Type/ })
    .selectOption("patio-roller");
  await expect(page.locator(".measurement-field")).toHaveCount(5);
  await page.locator("#measure-roller-diameter").fill("1.25");
  await page
    .getByRole("radio", { name: "Window Hardware", exact: true })
    .check();
  await expect(page.locator("#part-type")).toHaveValue("casement-operator");
  await expect(page.locator("#measure-arm-length")).toHaveValue("5 1/2");
  await expect(page.locator("#measurement-notes")).toHaveValue(
    "Pivot to pivot, viewed from inside",
  );
  await expect(
    page.getByLabel("Manufacturer / Brand", { exact: true }),
  ).toHaveValue("Visible brand");
  await page.getByRole("link", { name: "Back", exact: true }).last().click();
  await expect(page).toHaveURL("/find-part/preview");
  await page.getByRole("link", { name: "Continue to Add Details" }).click();
  await expect(page.locator("#measure-arm-length")).toHaveValue("5 1/2");
  await expect(page.getByAltText("Your selected part photo")).toBeVisible();
  await page.getByRole("radio", { name: "Door Parts", exact: true }).check();
  await expect(page.locator("#part-type")).toHaveValue("patio-roller");
  await expect(page.locator("#measure-roller-diameter")).toHaveValue("1.25");
});

test("fractions and unit conversion, review/edit/next-step guidance, and local-only information", async ({
  page,
}, testInfo) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await openDetails(page);
  await chooseOperator(page);
  await page.locator("#measure-arm-length").fill("5 1/2");
  await page.locator("#measure-base-width").fill("1 3/8");
  await page
    .getByRole("combobox", { name: "Measurement units" })
    .selectOption("mm");
  await expect(page.locator("#measure-arm-length")).toHaveValue("139.7");
  await expect(page.locator("#measure-base-width")).toHaveValue("34.925");
  await page.locator("#markings").fill("TEST-MARKING");
  await page.locator("#problem").fill("Handle turns without moving the arm");
  await page.screenshot({
    path: testInfo.outputPath("details.png"),
    fullPage: true,
  });
  await detailsToReview(page);
  await expect(page.getByText("139.7 mm", { exact: true })).toBeVisible();
  await expect(page.getByText("TEST-MARKING", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Automated product matching is not connected yet",
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("review.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Edit measurements", exact: true })
    .click();
  await page.locator("#measure-arm-length").fill("140");
  await detailsToReview(page);
  await expect(page.getByText("140 mm", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Continue to Next Steps" }).click();
  await expect(page).toHaveURL("/find-part/next-steps");
  await page.getByRole("link", { name: /Measurement guidance/ }).click();
  await expect(page).toHaveURL("/guides/measurements#overall-size");
  await expect(
    page.getByRole("heading", { name: "Measuring overall length and width" }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to Add Details", exact: true })
    .first()
    .click();
  await expect(page.locator("#measure-arm-length")).toHaveValue("140");
  expect(posts).toEqual([]);
  expect(
    await page.evaluate(() =>
      JSON.stringify({ ...localStorage, ...sessionStorage }),
    ),
  ).not.toContain("TEST-MARKING");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your photo is no longer available" }),
  ).toBeVisible();
});

test("Not Sure category and part type can complete review without invented matches", async ({
  page,
}) => {
  await openDetails(page);
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page
    .getByRole("combobox", { name: /Part Type/ })
    .selectOption("not-sure");
  await page
    .locator("#measurement-notes")
    .fill("Unsure of the mounting points");
  await detailsToReview(page);
  await expect(
    page.getByText("Unsure of the mounting points", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Hardware category is not known", { exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Continue to Next Steps" }).click();
  await expect(
    page.getByRole("heading", { name: "Your Next Steps" }),
  ).toBeVisible();
});

test("Guided Finder completes without photo, preserves edited answers, and opens editable intake", async ({
  page,
}, testInfo) => {
  await page.goto("/find-part/guided");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.locator(".guided-question").getByRole("alert"),
  ).toContainText("Choose an answer");
  await page.getByRole("radio", { name: "Window", exact: true }).check();
  await page.screenshot({
    path: testInfo.outputPath("guided.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", {
      name: "Supports or balances the window",
      exact: true,
    })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("radio", { name: /Sliding patio door mortise lock/ }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: /^Channel window balance/ }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "I have both", exact: true }).check();
  await page
    .getByLabel("Measurements and reference points (include units)")
    .fill("Metal channel measured separately; units are inches");
  await page
    .getByLabel("Part number or stamped code", { exact: true })
    .fill("GUIDE-TEST");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Possible category: Window Parts/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit location", exact: true })
    .click();
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page
    .getByRole("button", {
      name: "Question 5: Review your answers",
      exact: true,
    })
    .click();
  await expect(page.getByText("GUIDE-TEST", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Use these answers" }).click();
  await expect(page).toHaveURL("/find-part/details");
  await expect(page.locator("#part-type")).toHaveValue("channel-balance");
  await expect(page.locator("#markings")).toHaveValue("GUIDE-TEST");
  await expect(
    page.getByRole("link", { name: /Photo optional, not added$/ }),
  ).toBeVisible();
  await expect(page.locator(".measurement-field")).toHaveCount(3);
  await detailsToReview(page);
  await expect(
    page.getByRole("heading", { name: "Guided Finder answers" }),
  ).toBeVisible();
  await expect(
    page.getByText("Metal channel measured separately; units are inches", {
      exact: true,
    }),
  ).toBeVisible();
});

test("guided all-unknown journey and no-candidate path provide useful guidance", async ({
  page,
}) => {
  await page.goto("/find-part/guided");
  await page.getByRole("radio", { name: "Entry Door", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: "Locks or unlocks", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByText("These answers don’t narrow down a listed family yet.", {
      exact: false,
    }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: "No, I’m not sure", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Still Not Sure? We Can Help You Figure It Out." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Use these answers" }).click();
  await detailsToReview(page);
  await expect(
    page.getByText("Specific hardware type needs clarification", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Get help with missing measurements" })
    .click();
  await expect(page).toHaveURL("/guides/measurements#overall-size");
});

test("all provisional hardware measurement schemas render the intended distinct prompts", async ({
  page,
}) => {
  await openDetails(page);
  const scenarios = [
    ["Window Hardware", "casement-operator", "Arm length"],
    ["Window Hardware", "sash-cam-lock", "Keeper height"],
    ["Window Hardware", "track-fin-lock", "Track or fin width"],
    ["Window Parts", "spiral-balance", "Tube diameter"],
    ["Window Parts", "channel-balance", "Channel depth"],
    ["Door Hardware", "patio-mortise-lock", "Lock backset"],
    ["Door Hardware", "patio-handle-set", "Door thickness"],
    ["Door Hardware", "push-button-latch", "Latch reach"],
    ["Door Parts", "patio-roller", "Housing height"],
    ["Door Parts", "storm-closer", "Cylinder diameter"],
  ];
  for (const [category, type, field] of scenarios) {
    await page.getByRole("radio", { name: category, exact: true }).check();
    await page.locator("#part-type").selectOption(type);
    await expect(
      page.getByRole("textbox", { name: `${field} (in)`, exact: true }),
    ).toBeVisible();
  }
});

test("workflow mobile layouts, guide diagrams and decorative arrow avoid overflow and primary controls", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Viewport sweep also covers all requested mobile sizes",
  );
  test.setTimeout(120_000);
  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await openDetails(page);
    await chooseOperator(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .locator("#hardware-category")
      .getByRole("radio", { name: "Not Sure", exact: true })
      .check();
    await page.locator("#part-type").selectOption("not-sure");
    await detailsToReview(page);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/find-part/guided");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/guides/measurements");
    await expect(
      page.getByRole("img", { name: /Measure between mounting-hole centers/ }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.goto("/");
    expect(
      await page.evaluate(() => {
        const arrow = document.querySelector(".hero-arrow")!;
        if (getComputedStyle(arrow).display === "none") return true;
        const a = arrow.getBoundingClientRect();
        return [".snap-button", ".upload-button", "#hero-title"].every(
          (selector) => {
            const b = document.querySelector(selector)!.getBoundingClientRect();
            return (
              a.right <= b.left ||
              a.left >= b.right ||
              a.bottom <= b.top ||
              a.top >= b.bottom
            );
          },
        );
      }),
    ).toBe(true);
  }
});

test("fraction parsing, unit conversion and future matching boundary retain honest unknowns", () => {
  expect(parseMeasurement("1 1/2", "in")).toBe(1.5);
  expect(parseMeasurement("3/8", "in")).toBe(0.375);
  for (const text of ["1/0", "-2", "0", "abc", "1 2/0"])
    expect(parseMeasurement(text, "in")).toBeNull();
  expect(parseMeasurement("1/2", "mm")).toBeNull();
  const group = {
    unit: "in" as const,
    values: { arm: { value: "1 1/2", unknown: false } },
    notes: "Measured between pivots",
  };
  expect(convertGroup(group, "mm")?.values.arm.value).toBe("38.1");
  const invalid = {
    ...group,
    values: { arm: { value: "bad", unknown: true } },
  };
  expect(convertGroup(invalid, "mm")).toBeNull();
  expect(invalid.values.arm.value).toBe("bad");
  const draft = {
    ...emptyDraft(),
    category: "window-hardware" as const,
    typesByCategory: { "window-hardware": "casement-operator" },
    measurementsByType: {
      "casement-operator": {
        unit: "in" as const,
        values: {
          "arm-length": { value: "1/0", unknown: true },
          "base-width": { value: "1 1/2", unknown: false },
        },
        notes: "",
      },
    },
  };
  expect(validateDraft(draft)).toEqual({});
  const request = buildIdentificationIntake(draft, emptyGuided());
  expect(request.measurements.find((m) => m.id === "arm-length")).toMatchObject(
    { value: null, enteredValue: "", status: "unknown" },
  );
  expect(request.measurements.find((m) => m.id === "base-width")).toMatchObject(
    { value: 1.5, status: "provided" },
  );
  expect(request).not.toHaveProperty("match");
  expect(request).not.toHaveProperty("price");
});

test("editing guided markings updates copied values while preserving a later manual correction", async ({
  page,
}) => {
  await page.goto("/find-part/guided");
  await page.getByRole("radio", { name: "Window", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: "Locks or unlocks", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: /^Window sash cam lock and keeper/ })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", {
      name: "Yes, I have a part number or stamped code",
      exact: true,
    })
    .check();
  await page
    .getByLabel("Part number or stamped code", { exact: true })
    .fill("GUIDED-A");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Use these answers" }).click();
  await expect(page.locator("#markings")).toHaveValue("GUIDED-A");
  async function reviseGuided(value: string) {
    await page.getByRole("link", { name: "Back", exact: true }).last().click();
    await page.getByRole("button", { name: /^Question 4:/ }).click();
    await page
      .getByLabel("Part number or stamped code", { exact: true })
      .fill(value);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await page.getByRole("button", { name: "Use these answers" }).click();
  }
  await reviseGuided("GUIDED-B");
  await expect(page.locator("#markings")).toHaveValue("GUIDED-B");
  await page.locator("#markings").fill("MANUAL-CORRECTION");
  await reviseGuided("GUIDED-C");
  await expect(page.locator("#markings")).toHaveValue("MANUAL-CORRECTION");
  await detailsToReview(page);
  await expect(
    page.getByText("MANUAL-CORRECTION", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("GUIDED-C", { exact: true })).toBeVisible();
});
