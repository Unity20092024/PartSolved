import { test, expect } from "@playwright/test";

test("private invitation screen is accessible, validates locally, and stays within mobile widths", async ({ page }) => {
  await page.goto("/admin/blog/activate");
  test.skip(await page.getByRole("heading", { name: "Blog setup required" }).isVisible(), "Requires the configured Supabase publishable connection; no server secret needed.");
  await expect(page.getByRole("heading", { name: "Activate your administrator account" })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  await page.getByRole("button", { name: "Set password" }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/activate$/);
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(page.getByLabel("One-time email code")).toBeVisible();
  }
  await page.getByRole("link", { name: "Back to sign in" }).click();
  await expect(page.getByRole("heading", { name: "Administrator sign in" })).toBeVisible();
  await page.getByRole("link", { name: "Have an invitation or recovery code?" }).click();
  await expect(page).toHaveURL(/\/admin\/blog\/activate$/);
});

test("activation rejects cross-origin requests, signup attempts, and oversized requests", async ({ request, baseURL }) => {
  const url = `${baseURL}/api/blog/activate`;
  const wrongOrigin = await request.post(url, { headers: { origin: "https://attacker.invalid" }, form: { type: "invite" } });
  expect(wrongOrigin.status()).toBe(403);
  const invalid = await request.post(url, { headers: { origin: baseURL! }, form: { type: "signup", email: "not-an-email" } });
  expect(invalid.status()).toBe(400);
  const oversized = await request.post(url, { headers: { origin: baseURL! }, data: "x".repeat(5000) });
  expect(oversized.status()).toBe(413);
});
