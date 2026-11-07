import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const photographs = [
  ["Window balances", "window-balances.webp"],
  ["Window locks", "window-sash-lock.webp"],
  ["Casement crank operators", "casement-crank-operator.webp"],
  ["Patio door rollers", "patio-door-rollers.webp"],
  ["Patio door locks", "patio-door-mortise-lock.webp"],
  ["Door handles", "patio-door-handle-set.webp"],
  ["Storm door closers", "storm-door-closer.webp"],
  ["Hinges", "door-hinges.webp"],
  ["Screen door latches", "screen-door-push-button-latch.webp"],
  ["Sliding window track/fin locks", "sliding-window-fin-lock.webp"],
] as const;

test("all ten family photos load, remain uncropped, and carry into Review Possibilities", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/find-part/guided");
  await page.getByRole("button", { name: /Need a simpler way/ }).click();
  await page.getByRole("button", { name: /Show Me Common Parts/ }).click();
  const cards = page.locator(".assist-family-grid .assist-family");
  await expect(cards).toHaveCount(10);
  await expect(cards.locator("svg")).toHaveCount(0);
  for (const [name, filename] of photographs) {
    const asset = await page.request.get(`/images/part-families/${filename}`);
    expect(asset.status()).toBe(200);
    expect(asset.headers()["content-type"]).toContain("image/webp");
    const card = cards.filter({
      has: page.getByRole("heading", { name, exact: true }),
    });
    const image = card.locator("img");
    await expect(image).toHaveAttribute(
      "alt",
      `Example of ${name.toLowerCase()}, not an exact replacement`,
    );
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(encodeURIComponent(`/images/part-families/${filename}`)),
    );
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(image).toHaveCSS("object-fit", "contain");
    await expect(
      card.getByText("May help with:", { exact: false }),
    ).toBeVisible();
  }
  const originalViewport = page.viewportSize()!;
  if (testInfo.project.name.includes("desktop")) {
    for (const width of [320, 375, 390, 430, 768, 1280]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      for (const card of await cards.all()) {
        const imageBox = await card.locator("img").boundingBox();
        const cardBox = await card.boundingBox();
        expect(imageBox).not.toBeNull();
        expect(cardBox).not.toBeNull();
        expect(imageBox!.x).toBeGreaterThanOrEqual(0);
        expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(width);
        expect(imageBox!.height).toBeGreaterThan(140);
        expect(
          Math.abs(imageBox!.width / imageBox!.height - 1100 / 733),
        ).toBeLessThan(0.02);
        for (const button of await card.getByRole("button").all()) {
          const box = await button.boundingBox();
          expect(box!.height).toBeGreaterThanOrEqual(44);
          expect(box!.x + box!.width).toBeLessThanOrEqual(
            cardBox!.x + cardBox!.width,
          );
        }
      }
    }
  }
  await page.setViewportSize(originalViewport);
  await mkdir("artifacts/family-photographs", { recursive: true });
  await page.evaluate(async () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo({ top: 0, behavior: "instant" });
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
  });
  await page.screenshot({
    path: `artifacts/family-photographs/${testInfo.project.name}-gallery.png`,
    fullPage: true,
  });
  for (const [name, filename] of photographs) {
    await page
      .getByRole("button", { name: `This Looks Similar: ${name}`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Review Possibilities", exact: true })
      .click();
    const result = page.locator(".assist-results .assist-family");
    await expect(result).toHaveCount(1);
    await expect(
      result.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
    const image = result.locator("img");
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(encodeURIComponent(`/images/part-families/${filename}`)),
    );
    await expect
      .poll(() =>
        image.evaluate(
          (element: HTMLImageElement) =>
            element.complete && element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(
      result.getByRole("link", { name: "Measurement and identification help" }),
    ).toBeVisible();
    await expect(
      result.getByRole("button", {
        name: `That Looks Like My Part: ${name}`,
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Add More Details", exact: true }),
    ).toBeVisible();
    await expect(
      page.locator("summary").filter({ hasText: "Start Over" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Show Other Possibilities", exact: true })
      .click();
    await expect(
      page.getByRole("button", {
        name: `This Looks Similar: ${name}`,
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("button", { name: `Not This One: ${name}`, exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: `Not This One: ${name}`, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page
    .getByRole("button", {
      name: "This Looks Similar: Sliding window track/fin locks",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Review Possibilities", exact: true })
    .click();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    window.scrollTo({ top: 0, behavior: "instant" });
  });
  await page.screenshot({
    path: `artifacts/family-photographs/${testInfo.project.name}-review.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", {
      name: "That Looks Like My Part: Sliding window track/fin locks",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL("/find-part/details");
  await expect(page.getByRole("combobox", { name: /Part Type/ })).toHaveValue(
    "track-fin-lock",
  );
  expect(errors).toEqual([]);
});
