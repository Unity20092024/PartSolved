import { test, expect } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buildBlogLayoutHarness } from "./helpers/build-blog-layout-harness.mjs";
const output = path.resolve("test-results", `blog-layout-${process.pid}`);
test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
  await buildBlogLayoutHarness(output);
});
test("public blog shows the photograph, accessible hero and honest empty state without fabricated articles", async ({
  page,
}) => {
  await page.goto("/blog");
  await expect(
    page.getByRole("heading", { name: "BLOG", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Hardware advice, made practical.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".blog-hero img")).toBeVisible();
  expect(
    await page
      .locator(".blog-hero img")
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await expect(
    page.getByRole("heading", { name: "All Articles", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".blog-card")).toHaveCount(0);
  await expect(
    page.getByRole("heading", {
      name: "Our article library is getting ready.",
    }),
  ).toBeVisible();
  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/blog-redesign-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/blog-redesign-desktop.png",
    fullPage: true,
  });
});
test("card specimens keep the content order, real text-derived estimates and 1/2/3-column layouts", async ({
  page,
}) => {
  await page.route("**/__blog-layout", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/__blog-layout.css"></head><body><div id="blog-layout-root"></div><script src="/__blog-layout.js"></script></body></html>',
    }),
  );
  await page.route("**/__blog-layout.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: await readFile(path.join(output, "blog-layout-harness.js")),
    }),
  );
  await page.route("**/__blog-layout.css", async (route) =>
    route.fulfill({
      contentType: "text/css",
      body: (
        await Promise.all(
          ["src/app/globals.css", "src/app/blog/blog.css"].map((p) =>
            readFile(p, "utf8"),
          ),
        )
      ).join("\n"),
    }),
  );
  await page.goto("/__blog-layout");
  await expect(page.getByRole("note")).toContainText("not published articles");
  await expect(page.locator(".blog-card")).toHaveCount(3);
  await expect(page.locator(".blog-card").first()).toContainText("~2 min read");
  expect(
    await page
      .locator(".blog-card")
      .first()
      .evaluate((card) =>
        Array.from(
          card.querySelectorAll(
            ".blog-card-media,.blog-card-category,h3,.blog-card-excerpt,.blog-card-meta,.blog-read-link",
          ),
        ).map((element) => element.className || element.tagName),
      ),
  ).toEqual([
    "blog-card-media",
    "blog-card-category",
    "H3",
    "blog-card-excerpt",
    "blog-card-meta",
    "blog-read-link",
  ]);
  for (const [width, columns] of [
    [320, 1],
    [375, 1],
    [390, 1],
    [430, 1],
    [768, 2],
    [1024, 2],
    [1280, 3],
  ]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page
        .locator(".blog-grid")
        .evaluate(
          (grid) =>
            getComputedStyle(grid).gridTemplateColumns.split(" ").length,
        ),
    ).toBe(columns);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  const read = page.getByRole("link", {
    name: "Read article: Layout example: understanding window balances",
  });
  await read.focus();
  await expect(read).toBeFocused();
  await expect(read).toHaveAttribute("href", "/blog/layout-fixture-0");
  await read.evaluate((element) => (element as HTMLElement).blur());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/blog-card-specimens-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: "test-results/blog-card-specimens-desktop.png",
    fullPage: true,
  });
});
