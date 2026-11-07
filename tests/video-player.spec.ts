import { test, expect, type Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { buildVideoHarness } from "./helpers/build-video-harness.mjs";
import { resolveVideoSource } from "../src/lib/video-source";
import type { HybridVideoPlayerProps } from "../src/types/video";
const output = path.resolve("test-results", `video-player-harness-${process.pid}`);
const thumbnail = {
  src: "/images/window-sash-measurement.webp",
  alt: "Development test thumbnail",
  width: 960,
  height: 520,
} as const;
const youtube: HybridVideoPlayerProps = {
  title: "YouTube development fixture",
  source: { type: "youtube", videoId: "abcdefghijk" },
  thumbnail,
};
const mp4: HybridVideoPlayerProps = {
  title: "MP4 development fixture",
  source: { type: "mp4", src: "/videos/video-smoke.mp4" },
  thumbnail,
};

test.beforeAll(async () => {
  await mkdir(output, { recursive: true });
  await buildVideoHarness(output);
});
async function harness(page: Page, props: HybridVideoPlayerProps) {
  await page.route("**/__video-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><link rel="stylesheet" href="/__video-test.css"></head><body style="margin:0;padding:16px"><main style="max-width:560px;margin:auto"><div id="video-test-root"></div></main><script src="/__video-test.js"></script></body></html>',
    }),
  );
  await page.route("**/__video-test.js", async (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: await readFile(path.join(output, "video-harness.js")),
    }),
  );
  await page.route("**/__video-test.css", async (route) =>
    route.fulfill({
      contentType: "text/css",
      body: await readFile("src/components/guides/video-guides.css"),
    }),
  );
  await page.goto("/__video-test");
  await page.waitForFunction(() => typeof window.mountVideo === "function");
  await page.evaluate((props) => window.mountVideo(props), props);
  await expect(
    page.getByRole("button", { name: `Play ${props.title}`, exact: true }),
  ).toBeVisible();
}

test("source URLs use privacy-enhanced YouTube without autoplay and local MP4 only", () => {
  expect(resolveVideoSource(youtube.source)?.playback).toBe(
    "https://www.youtube-nocookie.com/embed/abcdefghijk?playsinline=1&rel=0",
  );
  expect(
    resolveVideoSource({ type: "youtube", videoId: "../injection" }),
  ).toBeNull();
  expect(
    resolveVideoSource({ type: "mp4", src: "//unapproved.example/video.mp4" }),
  ).toBeNull();
  expect(resolveVideoSource({ type: "mp4", src: "/video.txt" })).toBeNull();
  expect(resolveVideoSource(mp4.source)?.fallback).toBe(
    "/videos/video-smoke.mp4",
  );
});

test("YouTube remains a local thumbnail until keyboard activation, never autoplays, and cleans up", async ({
  page,
}) => {
  const embeds: string[] = [];
  await page.route("https://www.youtube-nocookie.com/embed/**", (route) => {
    embeds.push(route.request().url());
    return route.fulfill({
      contentType: "text/html",
      body: "<p>Development-only embed fixture. No tutorial or YouTube media is loaded.</p>",
    });
  });
  await harness(page, youtube);
  await expect(page.locator("iframe, video")).toHaveCount(0);
  expect(embeds).toEqual([]);
  const image = page.getByAltText("Development test thumbnail");
  await expect(image).toHaveAttribute("loading", "lazy");
  await expect(image).toHaveAttribute(
    "src",
    /%2Fimages%2Fwindow-sash-measurement.webp/,
  );
  await expect(
    page.getByRole("link", { name: /Watch on YouTube/ }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=abcdefghijk");
  await page
    .getByRole("button", { name: `Play ${youtube.title}`, exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("iframe")).toBeFocused();
  await expect.poll(() => embeds.length).toBe(1);
  expect(embeds[0]).not.toContain("autoplay");
  await expect(page.locator("iframe")).toHaveAttribute(
    "allow",
    "encrypted-media; picture-in-picture; fullscreen",
  );
  await page.getByRole("button", { name: "Close video", exact: true }).click();
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Play ${youtube.title}`, exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: `Play ${youtube.title}`, exact: true })
    .click();
  await page.evaluate(() => window.unmountVideo());
  await expect(page.locator("iframe")).toHaveCount(0);
});

test("MP4 uses preload none, waits for native Play, supports replacement and releases media", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/videos/video-smoke.mp4", async (route) => {
    requests++;
    await route.fulfill({
      contentType: "video/mp4",
      body: await readFile("tests/fixtures/video-smoke.mp4"),
    });
  });
  await harness(page, mp4);
  await expect(page.locator("video")).toHaveCount(0);
  expect(requests).toBe(0);
  await page
    .getByRole("button", { name: `Play ${mp4.title}`, exact: true })
    .click();
  const video = page.locator("video");
  await expect(video).toBeFocused();
  await expect(video).toHaveAttribute("preload", "none");
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.autoplay),
  ).toBe(false);
  expect(
    await video.evaluate((element: HTMLVideoElement) => element.paused),
  ).toBe(true);
  expect(requests).toBe(0);
  await page.keyboard.press("Space");
  await expect.poll(() => requests).toBeGreaterThan(0);
  await expect
    .poll(() =>
      video.evaluate((element: HTMLVideoElement) => element.currentTime),
    )
    .toBeGreaterThan(0);
  const cleanup = await page.evaluate(() => {
    const media = document.querySelector("video")!;
    let paused = false,
      released = false;
    media.pause = () => {
      paused = true;
    };
    media.load = () => {
      released = true;
    };
    window.unmountVideo();
    return { paused, released, source: media.getAttribute("src") };
  });
  expect(cleanup).toEqual({ paused: true, released: true, source: null });
  await expect(page.locator("video")).toHaveCount(0);
});

test("blocked media keeps a fallback and replacing the source returns to a thumbnail", async ({
  page,
}) => {
  await page.route("**/videos/video-smoke.mp4", (route) =>
    route.fulfill({ status: 404, body: "Missing development fixture" }),
  );
  await harness(page, mp4);
  await page
    .getByRole("button", { name: `Play ${mp4.title}`, exact: true })
    .click();
  await expect(page.locator("video")).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.getByRole("alert")).toContainText("could not be loaded");
  await expect(
    page.getByRole("link", { name: /Open MP4 directly/ }),
  ).toHaveAttribute("href", "/videos/video-smoke.mp4");
  await page.evaluate((props) => window.mountVideo(props), youtube);
  await expect(page.locator("video, iframe")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: `Play ${youtube.title}`, exact: true }),
  ).toBeVisible();
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const box = await page.locator(".hybrid-video-frame").boundingBox();
    expect(Math.abs(box!.width / box!.height - 16 / 9)).toBeLessThan(0.01);
  }
});

test("public Guides keeps written help and publishes no development tutorials or initial embeds", async ({
  page,
}) => {
  const youtubeRequests: string[] = [];
  page.on("request", (request) => {
    if (/youtube|ytimg|googlevideo/.test(request.url()))
      youtubeRequests.push(request.url());
  });
  await page.goto("/guides");
  await expect(
    page.getByRole("heading", {
      name: "How to Identify Your Part",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Take useful identification photos" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Video guides", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(/No video tutorials are published yet/),
  ).toBeVisible();
  await expect(page.locator("iframe, video")).toHaveCount(0);
  expect(youtubeRequests).toEqual([]);
  await page
    .getByRole("link", {
      name: "View measurement and identification help",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL("/guides/measurements");
  await expect(
    page.getByRole("heading", {
      name: "Measuring screw-hole spacing",
      exact: false,
    }),
  ).toBeVisible();
});
