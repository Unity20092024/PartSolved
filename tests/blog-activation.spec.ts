import { test, expect } from "@playwright/test";
const fragment = "#access_token=synthetic-untrusted-access&refresh_token=synthetic-refresh-session&type=invite";
test.beforeEach(async ({ request }) => {
  const response = await request.get("/admin/blog/activate");
  test.skip((await response.text()).includes("Blog setup required"), "Requires a configured Supabase publishable connection.");
});

test("default invitation fragment is scrubbed before confirmation, preserves privacy, and opens password setup", async ({ page }) => {
  const submissions: unknown[] = [], analytics: string[] = [];
  page.on("request", request => { if (request.url().includes("/_vercel/insights")) analytics.push(request.url()); });
  await page.route("**/api/blog/activate/session", async route => {
    submissions.push(route.request().postDataJSON());
    await route.fulfill({ json: { state: "ready", email: "owner@example.test" } });
  });
  await page.goto(`/admin/blog/activate${fragment}`);
  test.skip(await page.getByRole("heading", {name: "Blog setup required"}).isVisible(), "Supabase public connection required.");
  await expect(page).toHaveURL(/\/admin\/blog\/activate$/);
  await expect(page.getByRole("button", { name: "Continue invitation" })).toBeVisible();
  expect(submissions).toHaveLength(0);
  expect(await page.evaluate(() => Object.keys(localStorage).filter(x => x.startsWith("sb-")))).toEqual([]);
  await page.getByRole("button", {name: "Continue invitation"}).click();
  expect(submissions).toEqual([{ refresh_token: "synthetic-refresh-session" }]);
  await expect(page.getByText("owner@example.test", {exact: true})).toBeVisible();
  await expect(page.getByLabel("New password", {exact: true})).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    await page.setViewportSize({width, height: 900});
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", {name: "Set password", exact: true}).click();
  await expect(page).toHaveURL(/\/admin\/blog\/activate$/);
  await page.getByLabel("New password", {exact: true}).fill("synthetic-long-password");
  await page.getByLabel("Confirm password").fill("synthetic-long-password");
  let passwordBody = "";
  await page.route("**/api/blog/activate", async route => {
    passwordBody = route.request().postData() || "";
    await route.fulfill({status: 303, headers: {location: "/admin/blog/login?activated=1"}});
  });
  await page.getByRole("button", {name: "Set password", exact: true}).click();
  await expect(page.getByRole("status")).toContainText("Password set");
  expect(new URLSearchParams(passwordBody).get("password")).toBe("synthetic-long-password");
  expect(passwordBody).not.toContain("refresh_token");
  expect(analytics).toEqual([]);
});

test("default Site URL landing forwards to private activation and non-admin invitation acceptance does not unlock publishing", async ({page}) => {
  await page.route("**/api/blog/activate/session", route => route.fulfill({json: {state: "membership_required", email: "pending@example.test"}}));
  await page.goto(`/${fragment}`);
  await expect(page).toHaveURL(/\/admin\/blog\/activate$/);
  await page.getByRole("button", {name: "Continue invitation"}).click();
  await expect(page.getByRole("status")).toContainText("no administrator membership");
  await expect(page.getByRole("button", {name: "Check administrator access again"})).toBeVisible();
  await expect(page.getByLabel("New password", {exact: true})).toHaveCount(0);
  await page.getByRole("link", {name: "Back to sign in"}).click();
  await expect(page.getByRole("heading", {name: "Administrator sign in"})).toBeVisible();
});

test("expired and unrelated fragments fail clearly without exposing credentials", async ({page}) => {
  await page.goto("/admin/blog/activate#error=access_denied&error_code=otp_expired&error_description=do-not-echo-this");
  await expect(page).toHaveURL(/\/admin\/blog\/activate$/);
  await expect(page.getByRole("main").getByRole("alert")).toContainText("expired");
  await expect(page.getByText("do-not-echo-this")).toHaveCount(0);
  await expect(page.getByLabel("New password", {exact: true})).toHaveCount(0);
});

test("Preview helper validates the original Supabase URL and replaces untrusted return addresses", async ({page}) => {
  await page.goto("/admin/blog/activate");
  await page.getByText("Testing in Preview? Open your original invitation here", {exact: true}).click();
  const input = page.getByLabel("Original invitation confirmation link");
  await input.fill("https://attacker.invalid/auth/v1/verify?token="+"a".repeat(64)+"&type=invite");
  await page.getByRole("button", {name: "Open invitation in this environment"}).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("this PartSolved Supabase project");
  const project = "https://apaojqpgsvikagwlfgci.supabase.co";
  await page.route(`${project}/auth/v1/verify?**`, route => route.fulfill({contentType: "text/html", body: "Synthetic verification endpoint intercepted; no real invitation consumed."}));
  await input.fill(`${project}/auth/v1/verify?token=${"a".repeat(64)}&type=invite&redirect_to=https://attacker.invalid`);
  const verification = page.waitForRequest(request => request.url().startsWith(`${project}/auth/v1/verify?`));
  await page.getByRole("button", {name: "Open invitation in this environment"}).click();
  const url = new URL((await verification).url());
  expect(url.searchParams.get("redirect_to")).toBe("http://127.0.0.1:3000/admin/blog/activate");
});

test("activation APIs reject cross-origin, missing sessions, invalid credentials, and oversized requests", async ({request, baseURL}) => {
  for (const endpoint of ["/api/blog/activate", "/api/blog/activate/session"]) {
    expect((await request.post(endpoint, {headers: {origin: "https://attacker.invalid"}, data: {refresh_token: "synthetic-invalid"}})).status()).toBe(403);
    expect((await request.post(endpoint, {headers: {origin: baseURL!}, data: "x".repeat(5000)})).status()).toBe(endpoint.endsWith("session") ? 415 : 413);
  }
  const missing = await request.post("/api/blog/activate/session", {headers:{origin:baseURL!}, data:{refresh_token:""}});
  expect(missing.status()).toBe(400);
  const oversized = await request.post("/api/blog/activate/session", {headers:{origin:baseURL!}, data:{refresh_token:"x".repeat(5000)}});
  expect(oversized.status()).toBe(413);
  const password = await request.post("/api/blog/activate", {headers:{origin:baseURL!}, form:{password:"long-synthetic-password",confirmation:"long-synthetic-password"}});
  expect(password.status()).toBe(401);
  const invalid = await request.post("/api/blog/activate/session", {headers:{origin:baseURL!}, data:{refresh_token:"synthetic-invalid-refresh"}});
  expect(invalid.status()).toBe(401);
  expect(await invalid.text()).not.toContain("synthetic-invalid-refresh");
});
