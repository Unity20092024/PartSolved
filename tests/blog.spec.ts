import { test, expect, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { buildBlogHarness } from "./helpers/build-blog-harness.mjs";
import { emptyArticle, type Article } from "../src/lib/blog/content";
const output = path.resolve("test-results", `blog-editor-${process.pid}`),
  id = "db000000-0000-4000-8000-000000000001";
test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
  await buildBlogHarness(output);
});
async function editor(page: Page, conflict = false, delaySave = 0) {
  let article: Article = {
    id,
    document: {
      ...emptyArticle("local-test-draft"),
      author: "Local test author",
      excerpt: "Development fixture only.",
      body: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: "Local test content." }],
          },
        ],
      },
    },
    version: 1,
    status: "draft",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: null,
    scheduled_at: null,
    job_error: null,
    media_ids: [],
  };
  const writes: string[] = [];
  await page.route("**/__blog-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Local editor test</title><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/__blog-test.css"></head><body><div id="blog-test-root"></div><script src="/__blogchunks/blog-harness.js"></script></body></html>',
    }),
  );
  await page.route("**/__blogchunks/*.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: await readFile(
        path.join(
          output,
          path.basename(new URL(route.request().url()).pathname),
        ),
      ),
    }),
  );
  await page.route("**/__blog-test.css", async (route) =>
    route.fulfill({
      contentType: "text/css",
      body: (
        await Promise.all(
          [
            "src/app/globals.css",
            "src/app/blog/blog.css",
            "src/app/admin/blog/admin.css",
          ].map((p) => readFile(p, "utf8")),
        )
      ).join("\n"),
    }),
  );
  await page.route(`**/api/blog/posts/${id}`, async (route) => {
    const body = route.request().postDataJSON();
    writes.push(body.action);
    if (body.action === "save" && delaySave)
      await new Promise((resolve) => setTimeout(resolve, delaySave));
    if (conflict || body.version !== article.version) {
      await route.fulfill({
        status: 409,
        json: { error: "A newer revision exists." },
      });
      return;
    }
    if (body.action === "save")
      article = {
        ...article,
        document: body.document,
        version: article.version + 1,
      };
    else if (body.action === "publish")
      article = {
        ...article,
        status: "published",
        version: article.version + 1,
        published_at: new Date().toISOString(),
      };
    else if (body.action === "unpublish")
      article = { ...article, status: "draft", version: article.version + 1 };
    else if (body.action === "schedule")
      article = {
        ...article,
        status: "scheduled",
        version: article.version + 1,
        scheduled_at: body.at,
      };
    else if (body.action === "duplicate")
      article = { ...article, id: "db000000-0000-4000-8000-000000000002" };
    await route.fulfill({
      json: body.action === "delete" ? { deleted: true } : article,
    });
  });
  await page.goto("/__blog-test");
  await page.waitForFunction(
    () => typeof window.mountBlogEditor === "function",
  );
  await page.evaluate(
    (article) =>
      window.mountBlogEditor({
        article,
        categories: [],
        media: [],
        enabled: true,
        scheduling: true,
      }),
    article,
  );
  await expect(
    page.getByRole("textbox", { name: "Article body", exact: true }),
  ).toBeVisible();
  return { writes, article: () => article };
}
test("SEO routes use www and do not expose drafts or administrative content", async ({
  page,
  request,
}) => {
  await page.goto("/");
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    /^https:\/\/www\.partsolved\.com\/?$/,
  );
  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.status()).toBe(200);
  const xml = await sitemap.text();
  expect(xml).toContain("https://www.partsolved.com/");
  expect(xml).not.toMatch(/<loc>[^<]*(admin|preview|\/api\/)/);
  expect(xml).not.toContain("https://partsolved.com/");
  const robots = await request.get("/robots.txt");
  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    "Sitemap: https://www.partsolved.com/sitemap.xml",
  );
  await page.goto("/blog");
  await expect(
    page.getByRole("heading", { name: "Hardware advice, made practical." }),
  ).toBeVisible();
  expect((await request.get("/blog/unpublished-or-missing")).status()).toBe(
    404,
  );
  await page.goto("/admin/blog");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await expect(
    page.getByRole("heading", { name: "Blog setup required" }),
  ).toBeVisible();
  for (const route of [
    "/api/blog/posts",
    "/api/blog/categories",
    "/api/blog/media",
  ]) {
    const response = await request.post(route, {
      headers: { Origin: "https://attacker.test" },
    });
    expect(response.status()).toBe(403);
  }
  expect((await request.get(`/blog/media/${id}`)).status()).toBe(404);
});
test("mobile editor autosaves, previews, publishes and schedules through serialized revisions", async ({
  page,
}) => {
  const state = await editor(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByLabel("Article title", { exact: true })
    .fill("Window hardware help");
  await expect
    .poll(() => state.article().document.title)
    .toBe("Window hardware help");
  await page
    .getByLabel("Article title", { exact: true })
    .fill("Latest title before publishing");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect.poll(() => state.article().status).toBe("published");
  expect(state.article().document.title).toBe("Latest title before publishing");
  expect(state.writes.slice(-2)).toEqual(["save", "publish"]);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.lastBlogNavigation))
    .toBe(`/admin/blog/${id}/preview`);
  await page
    .getByText("Scheduling and article actions", { exact: true })
    .click();
  await page
    .getByLabel("Publication date and time (your local time)")
    .fill("2030-12-20T10:30");
  await page
    .getByRole("button", { name: "Schedule article", exact: true })
    .click();
  await expect.poll(() => state.article().status).toBe("scheduled");
  await page.getByRole("button", { name: "Unpublish", exact: true }).click();
  await expect.poll(() => state.article().status).toBe("draft");
});
test("conflicting autosave retains text and prevents later publication", async ({
  page,
}) => {
  await editor(page, true);
  await page
    .getByLabel("Article title", { exact: true })
    .fill("Keep this unsaved revision");
  await expect(page.getByRole("alert")).toContainText(
    "Another editor saved a newer revision",
  );
  await expect(page.getByLabel("Article title", { exact: true })).toHaveValue(
    "Keep this unsaved revision",
  );
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
});
test("typing during a background autosave preserves the newer text", async ({
  page,
}) => {
  const state = await editor(page, false, 800),
    input = page.getByLabel("Article title", { exact: true });
  const saving = page.waitForRequest(
    (request) =>
      request.url().includes(`/api/blog/posts/${id}`) &&
      request.method() === "POST",
  );
  await input.fill("First revision");
  await saving;
  await expect(input).toBeEnabled();
  await input.fill("Newer text while saving");
  await expect
    .poll(() => state.article().document.title, { timeout: 10_000 })
    .toBe("Newer text while saving");
  await expect(input).toHaveValue("Newer text while saving");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByRole("status").last()).toHaveText("All changes saved.");
});
test("category management supports create, edit and confirmed delete", async ({
  page,
}) => {
  await editor(page);
  page.on("dialog", (dialog) => dialog.accept());
  let savedName = "",
    removed = false;
  await page.route("**/api/blog/categories", async (route) => {
    const body = route.request().postDataJSON();
    if (body.action === "delete") {
      removed = true;
      await route.fulfill({ json: { deleted: true } });
      return;
    }
    savedName = body.name;
    await route.fulfill({
      json: { ...body, id: "db000000-0000-4000-8000-000000000004" },
    });
  });
  await page.getByText("Manage categories", { exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Window repairs");
  await page
    .getByLabel("URL slug", { exact: true })
    .last()
    .fill("window-repairs");
  await page
    .getByLabel("Description", { exact: true })
    .fill("Local category fixture");
  await page.getByRole("button", { name: "Add category", exact: true }).click();
  await expect.poll(() => savedName).toBe("Window repairs");
  await page
    .getByLabel("Name", { exact: true })
    .first()
    .fill("Window repair advice");
  await page
    .getByRole("button", { name: "Save category", exact: true })
    .click();
  await expect.poll(() => savedName).toBe("Window repair advice");
  await page
    .getByRole("button", { name: "Delete category", exact: true })
    .click();
  await expect.poll(() => removed).toBe(true);
});
test("image management validates uploads and connects the selected image to the article", async ({
  page,
}) => {
  await editor(page);
  const mediaId = "db000000-0000-4000-8000-000000000003";
  let uploadedBytes = 0;
  await page.route("**/api/blog/media", async (route) => {
    uploadedBytes = route.request().postDataBuffer()?.length || 0;
    await route.fulfill({
      status: 201,
      json: {
        id: mediaId,
        path: `${mediaId}.webp`,
        alt: "A window sash lock",
        width: 100,
        height: 100,
        bytes: uploadedBytes,
        state: "ready",
        created_at: new Date().toISOString(),
      },
    });
  });
  await page.route(`**/blog/media/${mediaId}`, async (route) =>
    route.fulfill({
      contentType: "image/webp",
      body: await readFile("tests/fixtures/color-swatch.webp"),
    }),
  );
  await page.getByText("Upload and manage images", { exact: true }).click();
  await page
    .getByLabel("Describe the image for accessibility")
    .fill("A window sash lock");
  const file = page.locator('input[name="image"]');
  await file.setInputFiles({
    name: "not-hardware.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("invalid"),
  });
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("Choose a JPEG");
  await file.setInputFiles({
    name: "too-big.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(page.getByRole("status").first()).toContainText("10 MiB");
  expect(uploadedBytes).toBe(0);
  await file.setInputFiles("tests/fixtures/color-swatch.jpg");
  await page.getByRole("button", { name: "Upload image", exact: true }).click();
  await expect(
    page.getByRole("img", { name: "A window sash lock" }),
  ).toBeVisible();
  expect(uploadedBytes).toBeGreaterThan(0);
  expect(uploadedBytes).toBeLessThan(2 * 1024 * 1024);
  await page
    .getByRole("combobox", { name: "Featured image", exact: true })
    .selectOption(mediaId);
  await page
    .getByLabel("Featured image alt text", { exact: true })
    .fill("A window sash lock");
  await expect(
    page.getByRole("combobox", { name: "Featured image", exact: true }),
  ).toHaveValue(mediaId);
});
test("duplicate and confirmed deletion use meaningful article actions", async ({
  page,
}) => {
  const state = await editor(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page
    .getByText("Scheduling and article actions", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Duplicate article", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.lastBlogNavigation))
    .toBe("/admin/blog/db000000-0000-4000-8000-000000000002");
  expect(state.writes).toContain("duplicate");
  await page
    .getByRole("button", { name: "Delete article", exact: true })
    .click();
  await expect
    .poll(() => page.evaluate(() => window.lastBlogNavigation))
    .toBe("/admin/blog");
  expect(state.writes).toContain("delete");
});
test("editor remains usable without overflow at phone, tablet and desktop widths", async ({
  page,
}) => {
  await editor(page);
  await page
    .getByLabel("Article title", { exact: true })
    .fill("Local development screenshot — unpublished draft");
  for (const width of [320, 375, 390, 430, 768, 1024, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("button", { name: "Save draft", exact: true }),
    ).toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: "test-results/blog-editor-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/blog-editor-desktop.png",
    fullPage: true,
  });
});
