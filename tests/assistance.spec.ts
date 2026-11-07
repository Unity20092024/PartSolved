import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { emptyAssistance } from "../src/types/assistance";
import { suggestFamilies, adoptFamily } from "../src/lib/assistance";
import { emptyDraft } from "../src/lib/intake";
const fixture = path.resolve("public/images/window-sash-lock.webp");
const recovery = "Still Not Sure? We Can Help You Figure It Out.";
async function help(page: Page) {
  await page.goto("/find-part/guided");
  await page.getByRole("button", { name: /Need a simpler way/ }).click();
  await expect(page.getByRole("heading", { name: recovery })).toBeVisible();
}
async function next(page: Page) {
  await page.getByRole("button", { name: "Next", exact: true }).click();
}

test("rules require evidence, return several possibilities, and respect customer exclusions", () => {
  expect(suggestFamilies(emptyAssistance())).toEqual([]);
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      location: "window",
      area: "not-sure",
      symptom: "not-sure",
    }),
  ).toEqual([]);
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      location: "window",
      symptom: "wont-stay",
    }).map((item) => item.family.id),
  ).toEqual(["balances"]);
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      location: "sliding-patio-door",
      symptom: "hard-slide",
      stuck: "bottom",
    })[0].family.id,
  ).toBe("rollers");
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      location: "sliding-patio-door",
      symptom: "wont-lock",
    }).map((item) => item.family.id),
  ).toEqual(["patio-locks", "handles"]);
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      location: "sliding-patio-door",
      symptom: "wont-lock",
      rejected: ["patio-locks", "handles"],
    }),
  ).toEqual([]);
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      similar: ["balances", "hinges", "handles", "rollers"],
    }),
  ).toHaveLength(3);
  expect(
    suggestFamilies({
      ...emptyAssistance(),
      location: "not-sure",
      symptom: "wont-lock",
    }),
  ).toEqual([]);
  const draft = {
    ...emptyDraft(),
    manufacturer: "Keep me",
    problem: "Existing note",
  };
  expect(adoptFamily(draft, "rollers", "New description")).toMatchObject({
    category: "door-parts",
    problem: "Existing note",
    manufacturer: "Keep me",
    typesByCategory: { "door-parts": "patio-roller" },
  });
});

test("all original answers can be unknown and still lead to interactive assistance", async ({
  page,
}) => {
  await page.goto("/find-part/guided");
  for (let step = 0; step < 3; step++) {
    await page.getByRole("radio", { name: "Not Sure", exact: true }).check();
    await page.getByRole("button", { name: "Continue", exact: true }).click();
  }
  await page
    .getByRole("radio", { name: "No, I’m not sure", exact: true })
    .check();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.getByRole("heading", { name: recovery })).toBeVisible();
  await page.getByRole("button", { name: /Tell Us What's Happening/ }).click();
  await page
    .getByRole("radio", { name: "I'm not sure what's wrong.", exact: true })
    .check();
  await next(page);
  await expect(
    page.getByRole("heading", {
      name: "We cannot narrow down a category yet.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Still Can't Figure It Out?" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to Original Answers" })
    .click();
  await page
    .getByRole("button", { name: "Edit location", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Not Sure", exact: true }),
  ).toBeChecked();
});

test("visual patio problem, keyboard selection, changing answers, and details handoff", async ({
  page,
}) => {
  await help(page);
  await page.getByRole("button", { name: /Tap Where the Problem Is/ }).click();
  await next(page);
  await expect(page.locator(".assist-step").getByRole("alert")).toContainText(
    "Choose an option",
  );
  await page
    .getByRole("radio", { name: "A sliding patio door", exact: true })
    .check();
  await next(page);
  const bottom = page.getByRole("button", {
    name: "Select Bottom rollers",
    exact: true,
  });
  await bottom.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("radio", { name: "Bottom rollers", exact: true }),
  ).toBeChecked();
  await next(page);
  await page
    .getByRole("radio", { name: "It's hard to slide.", exact: true })
    .check();
  await next(page);
  await expect(
    page.getByRole("heading", { name: "Where does it seem to get stuck?" }),
  ).toBeVisible();
  await page
    .getByRole("radio", { name: "Near the bottom", exact: true })
    .check();
  await next(page);
  await expect(page.locator(".assist-results h3")).toHaveText([
    "Patio door rollers",
  ]);
  await page
    .getByRole("button", { name: "Add More Details", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "It's hard to slide.", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("radio", { name: "It won't lock.", exact: true })
    .check();
  await next(page);
  await expect(page.locator(".assist-results h3")).toHaveText([
    "Patio door rollers",
    "Patio door locks",
    "Door handles",
  ]);
  await page
    .getByRole("button", {
      name: "That Looks Like My Part: Patio door locks",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL("/find-part/details");
  await expect(
    page.getByRole("radio", { name: "Door Hardware", exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("combobox", { name: /Part Type/ })).toHaveValue(
    "patio-mortise-lock",
  );
  await page
    .getByRole("button", { name: "Continue to Review", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Guided assistance notes" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Guided Finder answers", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("link", { name: "Edit or download assistance information" })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Identification notes", exact: true }),
  ).toContainText("It won't lock.");
});

test("known window and symptom need no photo or measurements; unknown area stays honest", async ({
  page,
}) => {
  await help(page);
  await page.getByRole("button", { name: /Tell Us What's Happening/ }).click();
  await page
    .getByRole("combobox", { name: "Where is the problem?" })
    .selectOption("window");
  await page
    .getByRole("radio", { name: "The window won't stay open.", exact: true })
    .check();
  await next(page);
  await expect(page.locator(".assist-results h3")).toHaveText([
    "Window balances",
  ]);
  await page.getByRole("button", { name: "Add More Details" }).click();
  await page
    .getByRole("combobox", { name: "Where is the problem?" })
    .selectOption("entry-door");
  await expect(
    page.getByRole("radio", {
      name: "The window won't stay open.",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("radio", { name: "I'm not sure what's wrong.", exact: true })
    .check();
  await next(page);
  await expect(
    page.getByRole("heading", {
      name: "We cannot narrow down a category yet.",
    }),
  ).toBeVisible();
});

test("supporting photos validate, annotate, survive navigation and export locally", async ({
  page,
}, testInfo) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST") posts.push(request.url());
  });
  await help(page);
  await page.getByRole("button", { name: /Show What's Broken/ }).click();
  const files = page.getByLabel("Supporting photo files", { exact: true });
  await files.setInputFiles({
    name: "bad.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a photo"),
  });
  await expect(page.locator(".assist-step").getByRole("alert")).toContainText(
    "choose an image file",
  );
  await files.setInputFiles({
    name: "large.jpg",
    mimeType: "image/jpeg",
    buffer: Buffer.alloc(10 * 1024 * 1024 + 1),
  });
  await expect(page.locator(".assist-step").getByRole("alert")).toContainText(
    "10 MiB",
  );
  const chooser = page.waitForEvent("filechooser");
  await page
    .getByRole("button", { name: "Take a Supporting Photo", exact: true })
    .click();
  const camera = await chooser;
  await expect(
    page.getByLabel("Supporting camera photo", { exact: true }),
  ).toHaveAttribute("capture", "environment");
  await camera.setFiles(fixture);
  await expect(page.locator(".assist-photo")).toHaveCount(1);
  const mark = page.getByRole("button", { name: /Mark problem area in/ });
  await mark.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("ArrowRight");
  await expect(page.getByText("Mark: 55% across, 50% down.")).toBeVisible();
  await page
    .getByRole("textbox", { name: "Describe the marked area (optional)" })
    .fill("This small piece fell off");
  await files.setInputFiles(fixture);
  await expect(page.locator(".assist-photo")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Remove window-sash-lock.webp", exact: true })
    .last()
    .click();
  await page
    .getByRole("button", { name: "Review Available Information" })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "We cannot narrow down a category yet.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Add Another Photo" }).click();
  await expect(
    page.getByRole("textbox", { name: "Describe the marked area (optional)" }),
  ).toHaveValue("This small piece fell off");
  await page.getByRole("button", { name: "Your summary", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Summary & Photos" }).click();
  const archive = await download;
  const target = testInfo.outputPath("identification.zip");
  await archive.saveAs(target);
  expect(spawnSync("unzip", ["-t", target], { encoding: "utf8" }).status).toBe(
    0,
  );
  const notes = spawnSync("unzip", ["-p", target, "identification-notes.txt"], {
    encoding: "utf8",
  }).stdout;
  expect(notes).toContain("marked at 55% across, 50% down");
  expect(notes).toContain("This small piece fell off");
  expect(
    spawnSync("unzip", ["-Z1", target], { encoding: "utf8" }).stdout,
  ).toContain("photos/1-window-sash-lock.webp");
  expect(posts).toEqual([]);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Guided Finder", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Need a simpler way/ }).click();
  await page.getByRole("button", { name: /Show What's Broken/ }).click();
  await expect(page.locator(".assist-photo")).toHaveCount(0);
  await expect(page.getByText(/Refreshing or closing/)).toBeVisible();
});

test("common families, rejections, responsive layouts and local recovery summary", async ({
  page,
}, testInfo) => {
  await help(page);
  await mkdir("artifacts/guided-assistance", { recursive: true });
  await page.screenshot({
    path: `artifacts/guided-assistance/${testInfo.project.name}-recovery.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: /Show Me Common Parts/ }).click();
  await page
    .getByRole("button", { name: "This Looks Similar: Hinges", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "This Looks Similar: Door handles",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Review Possibilities", exact: true })
    .click();
  await expect(page.locator(".assist-results h3")).toHaveText([
    "Hinges",
    "Door handles",
  ]);
  await page
    .getByRole("button", { name: "Not This One: Hinges", exact: true })
    .click();
  await expect(page.locator(".assist-results h3")).toHaveText(["Door handles"]);
  await page
    .getByRole("textbox", { name: "Describe the problem in your own words" })
    .fill("A piece near the door is loose");
  await page.getByRole("button", { name: "Show Other Possibilities" }).click();
  await expect(
    page.getByRole("button", { name: "Not This One: Hinges", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const width of [320, 375, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      )
      .toBe(true);
    for (const image of await page.locator(".assist-family-image").all())
      await expect(image).toBeVisible();
  }
  await page.setViewportSize({
    width: testInfo.project.name.includes("mobile") ? 375 : 1280,
    height: 900,
  });
  await page.screenshot({
    path: `artifacts/guided-assistance/${testInfo.project.name}-common-parts.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Your summary", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Identification notes", exact: true }),
  ).toContainText("A piece near the door is loose");
  await page.getByRole("button", { name: "Help options", exact: true }).click();
  await page.getByRole("button", { name: /Tap Where the Problem Is/ }).click();
  await page.getByRole("radio", { name: "A window", exact: true }).check();
  await next(page);
  await page.getByRole("radio", { name: "Not sure", exact: true }).check();
  await next(page);
  await page
    .locator(".assist-step")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "Not sure", exact: true }),
  ).toBeChecked();
  await page
    .locator(".assist-step")
    .getByRole("button", { name: "Back", exact: true })
    .click();
  await expect(
    page.getByRole("radio", { name: "A window", exact: true }),
  ).toBeChecked();
});
