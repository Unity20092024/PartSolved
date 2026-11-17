import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { buildBlogHarness } from "./helpers/build-blog-harness.mjs";
import { buildBlogReader } from "./helpers/build-blog-reader.mjs";
import {
  emptyArticle,
  cleanDocument,
  type Article,
  type ArticleDocument,
} from "../src/lib/blog/content";
import { normalizeImportedBody } from "../src/lib/blog/import-format";
const output = path.resolve("test-results", `editorial-${process.pid}`),
  id = "db000000-0000-4000-8000-000000000001",
  imageId = "db000000-0000-4000-8000-000000000003";
const photo =
  process.env.BLOG_REVIEW_PHOTO_FILE || "tests/fixtures/color-swatch.jpg";
const caption = process.env.BLOG_REVIEW_PHOTO_FILE
  ? "Design review image: Elizabeth Park greenhouse, Ragesoss / CC BY-SA 3.0. Not the reviewed AMERLIFE product."
  : "Development image fixture; not a product photograph.";
const sample = (): ArticleDocument => ({
  ...emptyArticle("editorial-fixture"),
  title: "Understanding your window hardware",
  excerpt: "Private design fixture for the article editor and reader.",
  author: "Local test author",
  body: {
    type: "doc",
    content: [
      "Select these words for bold.",
      "A useful section heading",
      "The next paragraph remains in place.",
    ].map((text) => ({ type: "paragraph", content: [{ type: "text", text }] })),
  },
});
test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
  await Promise.all([buildBlogHarness(output), buildBlogReader(output)]);
});
async function assets(page: Page) {
  await page.route("**/__editorial.css", async (route) =>
    route.fulfill({
      contentType: "text/css",
      body: (
        await Promise.all(
          [
            "src/app/globals.css",
            "src/app/blog/blog.css",
            "src/app/blog/editorial.css",
            "src/app/admin/blog/admin.css",
          ].map((file) => readFile(file, "utf8")),
        )
      ).join("\n"),
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
  await page.route("**/blog/media/*", async (route) =>
    route.fulfill({ contentType: "image/jpeg", body: await readFile(photo) }),
  );
}
async function mount(page: Page, document = sample(), articleId = id) {
  let article: Article = {
    id: articleId,
    document,
    version: 1,
    status: "draft",
    created_at: "2026-11-16T12:00:00Z",
    updated_at: "2026-11-16T12:00:00Z",
    published_at: null,
    scheduled_at: null,
    job_error: null,
    media_ids: [],
  };
  await assets(page);
  await page.route("**/__editorial-editor", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><link rel="stylesheet" href="/__editorial.css"></head><body><div id="blog-test-root"></div><script src="/__blogchunks/blog-harness.js"></script></body></html>',
    }),
  );
  await page.route(`**/api/blog/posts/${articleId}`, async (route) => {
    const input = route.request().postDataJSON();
    expect(input.action).toBe("save");
    expect(input.version).toBe(article.version);
    article = {
      ...article,
      version: article.version + 1,
      document: {
        ...cleanDocument(input.document),
        body: normalizeImportedBody(input.document.body),
      },
    };
    await route.fulfill({ json: article });
  });
  await page.route("**/api/blog/media", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 300));
    await route.fulfill({
      status: 201,
      json: {
        id: imageId,
        path: `${imageId}.webp`,
        alt: "Greenhouse photo",
        state: "ready",
        width: 1500,
        height: 1000,
        bytes: 20000,
        created_at: "2026-11-16T12:00:00Z",
      },
    });
  });
  const reopen = async () => {
    await page.goto("/__editorial-editor");
    await page.evaluate(
      (article) =>
        window.mountBlogEditor({
          article,
          categories: [],
          media: [],
          enabled: true,
          scheduling: false,
        }),
      article,
    );
    await expect(
      page.getByRole("textbox", { name: "Article body" }),
    ).toBeVisible();
  };
  await reopen();
  return { article: () => article, reopen };
}
async function select(page: Page, text: string) {
  await page
    .getByRole("textbox", { name: "Article body" })
    .evaluate((element, text) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        if (node.textContent === text) {
          const range = document.createRange();
          range.selectNodeContents(node);
          const selection = window.getSelection()!;
          selection.removeAllRanges();
          selection.addRange(range);
          (element as HTMLElement).focus();
          document.dispatchEvent(new Event("selectionchange"));
          return;
        }
      }
      throw new Error("Text not found");
    }, text);
}
async function showReader(page: Page, doc: ArticleDocument) {
  const require = createRequire(path.resolve("package.json")),
    { readerHtml } = require(path.join(output, "reader.cjs"));
  const html = readerHtml(doc);
  await assets(page);
  await page.route("**/__editorial-reader", (route) =>
    route.fulfill({ contentType: "text/html", body: html }),
  );
  await page.goto("/__editorial-reader");
  await page.evaluate(() => document.fonts.ready);
  return html;
}
test("Android-sized editor: bold, H2, affiliate link, cursor image, caption, autosave and reopen", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const state = await mount(page);
  await select(page, "Select these words for bold.");
  await page.getByRole("button", { name: "Bold", exact: true }).click();
  await expect(page.locator(".admin-rich-editor strong")).toHaveText(
    "Select these words for bold.",
  );
  await page
    .locator(".admin-rich-editor p")
    .filter({ hasText: "A useful section heading" })
    .click();
  await page.getByRole("button", { name: "H2", exact: true }).click();
  await expect(page.locator(".admin-rich-editor h2")).toHaveText(
    "A useful section heading",
  );
  await page
    .locator(".admin-rich-editor p")
    .filter({ hasText: "The next paragraph" })
    .click();
  await page.getByRole("button", { name: "Link", exact: true }).click();
  await page
    .getByLabel("Link address", { exact: true })
    .fill("https://example.com/retailer");
  await page
    .getByLabel("Link text (optional when text is selected)")
    .fill("Check retailer options");
  await page.getByRole("button", { name: "Apply link", exact: true }).click();
  await expect(page.locator(".admin-rich-editor a")).toHaveAttribute(
    "href",
    "https://example.com/retailer",
  );
  // Contextual insertion sits after the selected paragraph; the next paragraph must stay after the image.
  await page.locator(".admin-rich-editor h2").click();
  await page
    .getByRole("button", { name: "Insert image after this paragraph" })
    .click();
  await page.getByLabel("Choose photo from device").setInputFiles(photo);
  await page
    .getByLabel("Image alt text", { exact: true })
    .fill("Greenhouse in a garden — local design review photo");
  await page.getByLabel("Image caption (optional)").fill(caption);
  await page.getByRole("button", { name: "Insert image", exact: true }).click();
  await expect(page.locator(".admin-rich-editor figure img")).toBeVisible();
  await expect(page.locator(".admin-rich-editor figcaption")).toHaveText(
    caption,
  );
  await expect
    .poll(() =>
      state
        .article()
        .document.body.content?.some((node) => node.type === "image"),
    )
    .toBe(true);
  const types = state.article().document.body.content!.map((node) => node.type);
  expect(types.indexOf("image")).toBe(types.indexOf("heading") + 1);
  expect(types[types.indexOf("image") + 1]).toBe("paragraph");
  // Main toolbar also provides the same picker and cancellation preserves content.
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page.getByRole("button", { name: "Close image dialog" }).click();
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  const saved = JSON.stringify(state.article().document.body);
  await state.reopen();
  await expect(page.locator(".admin-rich-editor strong")).toHaveText(
    "Select these words for bold.",
  );
  await expect(page.locator(".admin-rich-editor h2")).toHaveText(
    "A useful section heading",
  );
  await expect(page.locator(".admin-rich-editor figcaption")).toHaveText(
    caption,
  );
  expect(JSON.stringify(state.article().document.body)).toBe(saved);
  // Replace/caption/remove an existing selected image without removing adjacent text.
  await page.locator(".admin-rich-editor figure img").click();
  await page.getByRole("button", { name: "Edit image", exact: true }).click();
  await page
    .getByLabel("Image caption (optional)")
    .fill(caption + " Caption edited.");
  await page.getByRole("button", { name: "Update image", exact: true }).click();
  await expect(page.locator(".admin-rich-editor figcaption")).toContainText(
    "Caption edited.",
  );
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".admin-rich-editor h2").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/editorial-editor-mobile.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results/editorial-editor-mobile-detail.png",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "test-results/editorial-editor-desktop.png",
    fullPage: true,
  });
  await page.locator(".admin-rich-editor figure img").click();
  await page.getByRole("button", { name: "Remove image", exact: true }).click();
  await expect(page.locator(".admin-rich-editor figure")).toHaveCount(0);
  await expect(page.locator(".admin-rich-editor")).toContainText(
    /The next paragraph.*remains in place\./,
  );
});
test("reader renders the complete imported article safely and fits all target widths", async ({
  page,
}) => {
  const record = process.env.BLOG_REVIEW_ARTICLE_FILE
    ? JSON.parse(await readFile(process.env.BLOG_REVIEW_ARTICLE_FILE, "utf8"))
    : null;
  const doc: ArticleDocument = record?.document || {
    ...sample(),
    body: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "## Measuring a part\n\n**Keep the hardware visible.** [Read our guide](/guides/measurements)",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "- Measure carefully\n- Record markings" },
          ],
        },
      ],
    },
  };
  // Local-only presentation specimen. No real article document or media reference is changed.
  doc.featured_image_id = imageId;
  doc.featured_alt =
    "Licensed greenhouse photograph for design review; not an AMERLIFE product photo";
  doc.body.content!.splice(2, 0, {
    type: "image",
    attrs: {
      mediaId: imageId,
      src: `/blog/media/${imageId}`,
      alt: doc.featured_alt,
      caption,
    },
  });
  doc.body.content!.push({
    type: "affiliateButton",
    attrs: {
      href: "https://example.com/retailer",
      label: "View retailer options (design test)",
    },
  });
  const html = await showReader(page, doc);
  expect(html).not.toContain("dangerouslySetInnerHTML");
  await expect(page.locator(".article-hero img")).toBeVisible();
  await expect(page.locator(".article-prose figure figcaption")).toHaveText(
    caption,
  );
  const all = await page.locator(".article-prose").innerText();
  expect(all).not.toMatch(/<\/?b>|\*\*|^##\s|\]\(https?:/m);
  if (record) {
    expect(all).toContain("Sources checked:");
    expect(all).toContain("Hustle Clan");
    await expect(page.locator(".article-prose h2")).toHaveCount(10);
    await expect(page.locator(".article-prose h3")).toHaveCount(4);
  }
  await expect(page.locator(".article-affiliate a")).toHaveAttribute(
    "rel",
    /sponsored/,
  );
  await page.locator(".article-affiliate a").focus();
  await expect(page.locator(".article-affiliate a")).toBeFocused();
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/editorial-reader-mobile.png",
    fullPage: true,
  });
  await page.screenshot({
    path: "test-results/editorial-reader-mobile-intro.png",
  });
  await page.locator(".article-prose figure").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "test-results/editorial-reader-mobile-image.png",
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/editorial-reader-desktop.png",
    fullPage: true,
  });
  await writeFile(path.join(output, "rendered-article.html"), html);
});
test("the review-only greenhouse is unavailable on public routes and sitemap", async ({
  request,
}) => {
  expect((await request.get("/blog/polycarbonate-greenhouse")).status()).toBe(
    404,
  );
  const sitemap = await request.get("/sitemap.xml");
  expect(await sitemap.text()).not.toContain("/blog/polycarbonate-greenhouse");
  const media = await request.get(
    "/blog/media/ecee678b-8032-40e5-aa03-9fd743618373",
  );
  expect(media.status()).toBe(404);
});

test("toolbar image keeps the exact cursor; invalid uploads and cancelled dialogs retain the draft", async ({
  page,
}) => {
  const state = await mount(page);
  const body = page.getByRole("textbox", { name: "Article body" });
  await body.evaluate((element) => {
    const node = element.querySelector("p")!.firstChild!;
    const range = document.createRange();
    range.setStart(node, 7);
    range.collapse(true);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    (element as HTMLElement).focus();
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.getByRole("button", { name: "Image", exact: true }).click();
  await page
    .getByLabel("Image alt text", { exact: true })
    .fill("Local test photograph");
  await page.getByLabel("Choose photo from device").setInputFiles({
    name: "invalid.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not an image"),
  });
  await page.getByRole("button", { name: "Insert image", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("JPEG");
  await page.getByLabel("Choose photo from device").setInputFiles(photo);
  await page.getByRole("button", { name: "Insert image", exact: true }).click();
  await expect(page.locator(".admin-rich-editor figure")).toHaveCount(1);
  await expect
    .poll(() => state.article().document.body.content?.[1].type)
    .toBe("image");
  expect(state.article().document.body.content?.[0].content?.[0].text).toBe(
    "Select ",
  );
  expect(state.article().document.body.content?.[2].content?.[0].text).toBe(
    "these words for bold.",
  );
  await page.locator(".admin-rich-editor p").last().click();
  await page
    .getByRole("button", { name: "Affiliate button", exact: true })
    .click();
  await page
    .getByLabel("Link address", { exact: true })
    .fill("https://example.com/shop");
  await page
    .getByLabel("Button label", { exact: true })
    .fill("Check retailer options");
  await page
    .getByRole("button", { name: "Insert affiliate button", exact: true })
    .click();
  await expect(
    page.locator(".admin-rich-editor .article-affiliate a"),
  ).toHaveAttribute("rel", /sponsored/);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await state.reopen();
  await expect(
    page.locator(".admin-rich-editor .article-affiliate a"),
  ).toHaveText("Check retailer options");
  await expect(page.locator(".admin-rich-editor figure")).toHaveCount(1);
});
test("complete greenhouse opens in the real editor with a private hold and prepared formatting", async ({
  page,
}) => {
  test.skip(
    !process.env.BLOG_REVIEW_ARTICLE_FILE,
    "Owner article is a local-only private review input.",
  );
  const record = JSON.parse(
    await readFile(process.env.BLOG_REVIEW_ARTICLE_FILE!, "utf8"),
  );
  const state = await mount(page, record.document, record.id);
  await expect(
    page.getByRole("button", { name: "Publish", exact: true }),
  ).toBeDisabled();
  expect(state.article().version).toBe(1);
  const body = page.getByRole("textbox", { name: "Article body" });
  await expect(body).toContainText("Sources checked:");
  expect(await body.innerText()).not.toMatch(/<\/?b>|\*\*|^##\s|\]\(https?:/m);
  await page.locator(".admin-rich-editor p").first().click();
  await page
    .getByRole("button", { name: "Insert image after this paragraph" })
    .click();
  await page.getByLabel("Choose photo from device").setInputFiles(photo);
  await page
    .getByLabel("Image alt text", { exact: true })
    .fill("Licensed greenhouse photograph for local design review");
  await page.getByLabel("Image caption (optional)").fill(caption);
  await page.getByRole("button", { name: "Insert image", exact: true }).click();
  await expect(page.locator(".admin-rich-editor figure")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Featured image", exact: true })
    .selectOption(imageId);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await state.reopen();
  expect(state.article().document.featured_image_id).toBe(imageId);
  await expect(page.locator(".admin-rich-editor figcaption")).toHaveText(
    caption,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".admin-rich-editor figure").scrollIntoViewIfNeeded();
  await page
    .locator(".editor-sticky-toolbar")
    .evaluate((element) => (element.scrollLeft = 0));
  await page.screenshot({
    path: "test-results/greenhouse-editor-mobile-detail.png",
  });
  await page.screenshot({
    path: "test-results/greenhouse-editor-mobile-full.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({ path: "test-results/greenhouse-editor-desktop.png" });
});
