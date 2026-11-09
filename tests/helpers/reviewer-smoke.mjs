// Isolated local integration check. No OpenAI credential; no external photo transfer.
import { createServer } from "node:https";
import { spawn, spawnSync } from "node:child_process";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { chromium } from "@playwright/test";
const database = new URL(process.env.AI_TEST_DATABASE_URL || "");
if (
  !["127.0.0.1", "localhost"].includes(database.hostname) ||
  database.pathname !== "/ai_test"
)
  throw new Error("Dedicated local ai_test database required");
const directory = path.resolve("test-results/reviewer-smoke");
await mkdir(directory, { recursive: true });
await mkdir("artifacts", { recursive: true });
const cert = path.join(directory, "cert.pem"),
  key = path.join(directory, "key.pem");
const generated = spawnSync(
  "openssl",
  [
    "req",
    "-x509",
    "-newkey",
    "rsa:2048",
    "-nodes",
    "-keyout",
    key,
    "-out",
    cert,
    "-days",
    "1",
    "-subj",
    "/CN=localhost",
    "-addext",
    "subjectAltName=DNS:localhost,IP:127.0.0.1",
  ],
  { stdio: "ignore" },
);
if (generated.status !== 0)
  throw new Error("Could not create local test certificate");
const pool = new Pool({ connectionString: database.toString() });
const statements = {
  ai_take_rate_slot: [
    "select public.ai_take_rate_slot($1,$2) as result",
    ["p_ip", "p_action"],
  ],
  ai_usage_summary: ["select public.ai_usage_summary() as result", []],
};
const ledger = createServer(
  { cert: await readFile(cert), key: await readFile(key) },
  async (request, response) => {
    if (request.headers.apikey !== "local-development-fixture") {
      response.writeHead(403).end();
      return;
    }
    const name = request.url.split("/").at(-1);
    console.log("Local accounting RPC:", name);
    const statement = statements[name];
    if (!statement) {
      response.writeHead(404).end();
      return;
    }
    const buffers = [];
    for await (const buffer of request) buffers.push(buffer);
    const body = JSON.parse(Buffer.concat(buffers).toString());
    const client = await pool.connect();
    try {
      await client.query("set role service_role");
      const result = await client.query(
        statement[0],
        statement[1].map((field) => body[field]),
      );
      response
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify(result.rows[0].result));
    } catch {
      response.writeHead(503).end();
    } finally {
      await client.query("reset role");
      client.release();
    }
  },
);
await new Promise((resolve) => ledger.listen(55433, "127.0.0.1", resolve));
const environment = {
  ...process.env,
  AI_ANALYSIS_ENABLED: "true",
  AI_LOCAL_REVIEW: "true",
  AI_ALLOWED_ORIGIN: "http://127.0.0.1:3001",
  AI_SESSION_SECRET: "local-session-fixture-".repeat(3),
  AI_IP_HASH_SECRET: "local-ip-fixture-".repeat(3),
  AI_REVIEW_ACCESS_TOKEN: "local-review-fixture-".repeat(3),
  SUPABASE_URL: "https://127.0.0.1:55433",
  SUPABASE_SECRET_KEY: "local-development-fixture",
  NODE_EXTRA_CA_CERTS: cert,
};
delete environment.VERCEL;
delete environment.VERCEL_ENV;
delete environment.OPENAI_API_KEY;
const server = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "start",
    "--hostname",
    "127.0.0.1",
    "--port",
    "3001",
  ],
  { env: environment, stdio: ["ignore", "pipe", "pipe"] },
);
let logs = "";
server.stdout.on("data", (value) => {
  logs += value;
});
server.stderr.on("data", (value) => {
  logs += value;
});
let browser;
try {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      if ((await fetch("http://127.0.0.1:3001")).ok) break;
    } catch {
      /* starting */
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || "/usr/bin/chromium",
  });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto("http://127.0.0.1:3001/find-part/ai-review");
  await page
    .getByLabel("Reviewer access token")
    .fill(environment.AI_REVIEW_ACCESS_TOKEN);
  const signedIn = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/hardware/review") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Open Development Review" }).click();
  const signInResponse = await signedIn;
  if (signInResponse.status() !== 303)
    throw new Error(
      `Reviewer login failed: ${signInResponse.status()} Origin=${signInResponse.request().headers().origin} Site=${signInResponse.request().headers()["sec-fetch-site"]}`,
    );
  await page.getByRole("heading", { name: /AI Photo Assist/ }).waitFor();
  await page
    .getByLabel("Add a photo or follow-up view")
    .setInputFiles("public/images/part-families/casement-crank-operator.webp");
  await page.getByLabel("Select photo 1 for analysis").check();
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "artifacts/ai-photo-assist-review-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
    window.scrollTo(0, 0);
  });
  await page.screenshot({
    path: "artifacts/ai-photo-assist-review-desktop.png",
    fullPage: true,
  });
  await page.getByLabel(/I agree to send/).check();
  await page
    .getByRole("button", { name: "Analyze Photo", exact: true })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "temporarily unavailable" })
    .waitFor();
  await page
    .getByRole("link", { name: "Reviewer usage and session controls" })
    .click();
  await page.getByRole("heading", { name: "Analysis allowance" }).waitFor();
  await page.getByRole("button", { name: "End Reviewer Session" }).click();
  if (await page.getByRole("heading", { name: /AI Photo Assist/ }).count())
    throw new Error("Reviewer gate remained open after logout");
  console.log(
    "PASS: actual app reviewer sign-in, local persistent RPC, consent UI, missing-credential recovery, usage monitor and logout. No OpenAI requests.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await writeFile(path.join(directory, "server.log"), logs);
  await new Promise((resolve) => ledger.close(resolve));
  await pool.end();
}
