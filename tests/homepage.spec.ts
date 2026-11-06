import { test, expect, type Page } from "@playwright/test";
const photo = {
  name: "part.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j0ioAAAAASUVORK5CYII=",
    "base64",
  ),
};
const upload = (page: Page) =>
  page.getByLabel("Upload a photo of your part", { exact: true });

test("homepage renders reference copy and all category links", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page).toHaveTitle("PartSolved™ | Window & Door Parts Finder");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Take a Picture.Find the RIGHT PART.",
  );
  await expect(page.locator(".category-card")).toHaveCount(4);
  for (const slug of [
    "window-hardware",
    "door-hardware",
    "window-parts",
    "door-parts",
  ]) {
    await page.locator(`.category-card[href="/categories/${slug}"]`).click();
    await expect(
      page.getByRole("heading", { name: "Our catalog is on the way" }),
    ).toBeVisible();
    await page.getByRole("link", { name: "Back to home" }).click();
  }
  expect(errors).toEqual([]);
});

test("local photo preview, replacement, invalid replacement, remove and refresh recovery", async ({
  page,
}) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await page.goto("/");
  await upload(page).setInputFiles(photo);
  await expect(page.getByAltText("Your selected part photo")).toBeVisible();
  await upload(page).setInputFiles({ ...photo, name: "replacement.png" });
  await expect(page.locator("figcaption")).toHaveText("replacement.png");
  await upload(page).setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a photo"),
  });
  await expect(page.locator("#photo-error")).toContainText(
    "Please choose an image file",
  );
  await expect(page.locator("figcaption")).toHaveText("replacement.png");
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await expect(page).toHaveURL("/find-part/details");
  await expect(page.getByAltText("Your selected part photo")).toBeVisible();
  await page.getByRole("link", { name: "Replace photo" }).click();
  await page.getByRole("button", { name: "Remove image" }).click();
  await expect(
    page.getByRole("heading", { name: "Take a Photo of Your Part" }),
  ).toBeVisible();
  await upload(page).setInputFiles(photo);
  await page.getByRole("link", { name: "Continue", exact: true }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Your photo is no longer available" }),
  ).toBeVisible();
  expect(posts).toEqual([]);
});

test("validates oversized, empty, damaged and unsupported images", async ({
  page,
}) => {
  await page.goto("/");
  await upload(page).setInputFiles({
    name: "large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.locator("#photo-error")).toContainText("10 MB or less");
  await upload(page).setInputFiles({
    name: "empty.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(0),
  });
  await expect(page.locator("#photo-error")).toContainText("empty");
  await upload(page).setInputFiles({
    name: "damaged.png",
    mimeType: "image/png",
    buffer: Buffer.from("not decodable"),
  });
  await expect(page.locator("#photo-error")).toContainText("couldn’t open");
  await upload(page).setInputFiles({
    name: "drawing.svg",
    mimeType: "image/svg+xml",
    buffer: Buffer.from("<svg/>"),
  });
  await expect(page.locator("#photo-error")).toContainText(
    "rather than an SVG",
  );
});

test("camera and upload controls open their separate pickers", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByLabel("Take a photo of your part", { exact: true }),
  ).toHaveAttribute("capture", "environment");
  await expect(upload(page)).not.toHaveAttribute("capture");
  for (const name of ["Snap a Photo Now", "Upload a Photo"]) {
    const picker = page.waitForEvent("filechooser");
    await page.getByRole("button", { name, exact: true }).click();
    const chooser = await picker;
    await chooser.setFiles(photo);
    await expect(page.getByAltText("Your selected part photo")).toBeVisible();
    await page.getByRole("button", { name: "Remove image" }).click();
  }
});

test("search is usable and dialogs support keyboard dismissal and focus restoration", async ({
  page,
}) => {
  await page.goto("/");
  const opener = page.getByRole("button", { name: "Search catalog" });
  await opener.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page
    .getByLabel("Part name, number, or description")
    .fill("window latch");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("status")).toContainText(
    "Catalog search is not connected",
  );
  await expect(page.getByRole("status")).toContainText("window latch");
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(opener).toBeFocused();
});

test("navigation, favorites and account states are reachable", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const mobile = testInfo.project.name.includes("mobile");
  for (const label of ["Windows", "Doors", "Guides", "Support"]) {
    if (mobile)
      await page.getByRole("button", { name: "Open navigation menu" }).click();
    const navigation = mobile
      ? page.getByRole("dialog")
      : page.getByRole("navigation", { name: "Main navigation" });
    await navigation.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(`/${label.toLowerCase()}`);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.goto("/");
  for (const feature of ["favorites", "account"]) {
    if (mobile) {
      await page.getByRole("button", { name: "Open navigation menu" }).click();
      await page
        .getByRole("button", { name: new RegExp(`^${feature}$`, "i") })
        .click();
    } else await page.getByRole("button", { name: `Open ${feature}` }).click();
    await expect(page.getByRole("dialog")).toContainText(
      feature === "favorites"
        ? "No saved parts yet"
        : "Account features are coming soon",
    );
    await page.keyboard.press("Escape");
  }
  await page.getByRole("link", { name: "Start Guided Finder" }).click();
  await expect(page).toHaveURL("/find-part/guided");
  await expect(
    page.getByRole("heading", {
      name: "The guided finder is not available yet",
    }),
  ).toBeVisible();
  await page.goto("/categories/unknown");
  await expect(
    page.getByRole("heading", { name: "We couldn’t find that page" }),
  ).toBeVisible();
});

test("no horizontal overflow at target widths, with screenshots", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name.includes("mobile"),
    "Covered by desktop viewport resizing",
  );
  for (const width of [320, 375, 540, 699, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const clipping = await page
      .locator(".category-caption h3, .hero h1, .snap-button")
      .evaluateAll((elements) =>
        elements
          .filter((el) => el.scrollWidth > el.clientWidth + 1)
          .map((el) => el.textContent),
      );
    expect(clipping).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`homepage-${width}.png`),
      fullPage: true,
    });
  }
});
