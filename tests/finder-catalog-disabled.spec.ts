import { test, expect } from "@playwright/test";
test("unapplied catalog setup is an honest unavailable state with guidance, never demonstration matches", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Upload a photo of your part", { exact: true })
    .setInputFiles("public/images/window-sash-lock.webp");
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await page.getByRole("link", { name: "Continue to Add Details" }).click();
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.locator("#part-type").selectOption("not-sure");
  await page.getByRole("button", { name: "Continue to Review" }).click();
  await page.getByRole("link", { name: "Search Catalog", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Catalog search is not connected yet",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".finder-candidate")).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Read an identification guide",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator(".workflow-privacy")).toContainText(
    "written details only",
  );
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "/find-part/results",
  );
  expect(await (await request.get("/find-part/results")).text()).toContain(
    "noindex",
  );
});

test("Guided Finder without a photo retains optional progress and can reach catalog guidance", async ({
  page,
}) => {
  await page.goto("/find-part/guided");
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("radio", { name: "No, I’m not sure", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page
    .getByRole("button", { name: "Use these answers", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Continue to Review", exact: true })
    .click();
  await page.getByRole("link", { name: "Search Catalog", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Catalog search is not connected yet",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /Photo optional, not added$/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Your photo is no longer available",
      exact: true,
    }),
  ).toHaveCount(0);
});
