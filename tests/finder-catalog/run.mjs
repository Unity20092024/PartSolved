// Loopback-only integration facade for the REAL anon PostgreSQL functions and Next API.
// No application fixture routes, external Supabase resources, real API keys or AI calls.
import pg from "pg";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:https";
import { createServer as createPortProbe } from "node:net";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { asAnon, prepareDatabase } from "./database.mjs";
const url = new URL(process.env.CATALOG_TEST_DATABASE_URL || "");
assert(
  ["127.0.0.1", "localhost"].includes(url.hostname) &&
    url.pathname === "/catalog_test" &&
    !url.search &&
    !url.hash &&
    ["postgres:", "postgresql:"].includes(url.protocol),
  "Dedicated disposable loopback catalog_test database required",
);
function command(cmd, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env, stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`)),
    );
  });
}
await command(process.execPath, ["tests/catalog/database.mjs"]);
const pool = new pg.Pool({ connectionString: url.href, query_timeout: 7000 });
let next, facade;
try {
  const seed = await prepareDatabase(pool);
  const directory = path.resolve("artifacts/finder-catalog/local");
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, "seed.json"), JSON.stringify(seed));
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
  assert.equal(generated.status, 0);
  const source = await readFile("public/images/window-sash-lock.webp");
  facade = createServer(
    { cert: await readFile(cert), key: await readFile(key) },
    async (req, res) => {
      try {
        const endpoint = new URL(req.url, "https://127.0.0.1:55434");
        if (
          endpoint.pathname.startsWith("/rest/v1/") &&
          (req.headers.apikey !== "sb_publishable_local_fixture" ||
            (req.headers.authorization &&
              req.headers.authorization !==
                "Bearer sb_publishable_local_fixture"))
        ) {
          res.writeHead(403).end();
          return;
        }
        if (
          !["sb_publishable_local_fixture", "local-test-server-key"].includes(
            req.headers.apikey,
          )
        ) {
          res.writeHead(403).end();
          return;
        }
        if (
          req.method === "GET" &&
          endpoint.pathname.startsWith("/storage/v1/object/")
        ) {
          const file = endpoint.pathname.split("/").pop();
          const record = await asAnon(
            pool,
            "select id from catalog_media where path=$1",
            [file],
          );
          if (!record.rows.length) {
            res.writeHead(404).end();
            return;
          }
          res
            .writeHead(200, {
              "content-type": "image/webp",
              "cache-control": "private,no-store",
            })
            .end(source);
          return;
        }
        if (
          req.method === "POST" &&
          endpoint.pathname.startsWith("/rest/v1/rpc/")
        ) {
          let size = 0;
          const chunks = [];
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 8192) throw Error("bounded request");
            chunks.push(chunk);
          }
          const body = JSON.parse(Buffer.concat(chunks).toString());
          let result;
          if (endpoint.pathname.endsWith("/catalog_find"))
            result = await asAnon(
              pool,
              "select catalog_find($1,$2,$3,$4,$5::jsonb,$6,$7) value",
              [
                body.p_number,
                body.p_brand,
                body.p_families,
                body.p_words,
                JSON.stringify(body.p_measurements),
                body.p_limit,
                body.p_offset,
              ],
            );
          else if (endpoint.pathname.endsWith("/catalog_document"))
            result = await asAnon(pool, "select catalog_document($1) value", [
              body.p_id,
            ]);
          else {
            res.writeHead(404).end();
            return;
          }
          res
            .writeHead(200, { "content-type": "application/json" })
            .end(JSON.stringify(result.rows[0].value));
          return;
        }
        if (req.method === "GET" && endpoint.pathname.startsWith("/rest/v1/")) {
          const table = endpoint.pathname.split("/").pop(),
            q = endpoint.searchParams;
          let result;
          if (table === "catalog_products")
            result = await asAnon(
              pool,
              "select id from catalog_products where slug=$1 and status='published' and not synthetic",
              [(q.get("slug") || "").replace(/^eq\./, "")],
            );
          else if (table === "catalog_media")
            result = await asAnon(
              pool,
              "select path,state from catalog_media where id=$1 and state='ready'",
              [(q.get("id") || "").replace(/^eq\./, "")],
            );
          else if (
            [
              "catalog_manufacturers",
              "catalog_suppliers",
              "catalog_sources",
            ].includes(table)
          )
            result = await asAnon(
              pool,
              `select * from public.${table} order by id limit 500`,
            );
          else {
            res.writeHead(404).end();
            return;
          }
          const value = (req.headers.accept || "").includes("vnd.pgrst.object")
            ? result.rows[0] || null
            : result.rows;
          res
            .writeHead(200, { "content-type": "application/json" })
            .end(JSON.stringify(value));
          return;
        }
        res.writeHead(404).end();
      } catch {
        res.writeHead(400, { "content-type": "application/json" }).end(
          JSON.stringify({
            message: "Local read-only fixture request rejected",
          }),
        );
      }
    },
  );
  await new Promise((resolve) => facade.listen(55434, "127.0.0.1", resolve));
  const env = {
    ...process.env,
    SUPABASE_URL: "https://127.0.0.1:55434",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_fixture",
    SUPABASE_SECRET_KEY: "local-test-server-key",
    CATALOG_ENABLED: "true",
    CATALOG_WRITES_ENABLED: "false",
    BLOG_WRITES_ENABLED: "false",
    BLOG_ADMIN_ORIGIN: "http://127.0.0.1:3300",
    AI_ANALYSIS_ENABLED: "false",
    NODE_EXTRA_CA_CERTS: cert,
  };
  for (const name of [
    "VERCEL",
    "VERCEL_ENV",
    "VERCEL_BRANCH_URL",
    "VERCEL_URL",
    "OPENAI_API_KEY",
  ])
    delete env[name];
  await new Promise((resolve, reject) => {
    const probe = createPortProbe();
    probe.once("error", () =>
      reject(
        new Error(
          "Local test port 3300 is already in use; refusing to test another server.",
        ),
      ),
    );
    probe.listen(3300, "127.0.0.1", () => probe.close(resolve));
  });
  next = spawn(
    process.execPath,
    [
      "node_modules/next/dist/bin/next",
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      "3300",
    ],
    { env, stdio: ["ignore", "pipe", "pipe"] },
  );
  let logs = "";
  next.stdout.on("data", (chunk) => {
    logs += chunk.toString();
  });
  next.stderr.on("data", (chunk) => {
    logs += chunk.toString();
  });
  const deadline = Date.now() + 30000;
  let ready = false;
  while (Date.now() < deadline) {
    if (next.exitCode !== null)
      throw new Error(
        "Local Next child exited before readiness: " + logs.slice(-1000),
      );
    try {
      const response = await fetch("http://127.0.0.1:3300/find-part/results");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready)
    throw Error(
      "Local Next integration server failed to start: " + logs.slice(-1000),
    );
  const smoke = await fetch("http://127.0.0.1:3300/api/finder/catalog", {
    method: "POST",
    headers: {
      Origin: "http://127.0.0.1:3300",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      category: "window-hardware",
      group: "windows",
      partType: "sash-cam-lock",
      manufacturer: "LOCAL FIXTURE MAKER",
      number: "SYN-MPN-001",
      description: "",
      measurements: [],
      page: 0,
    }),
  });
  assert.equal(
    smoke.status,
    200,
    `Local Next API smoke failed: ${await smoke.clone().text()}`,
  );
  assert.equal(
    (await smoke.json()).candidates[0].label,
    "Exact Part Number Found",
  );
  console.log(
    "PASS real Next written-details API smoke through anonymous PostgreSQL",
  );
  await command(
    process.execPath,
    [
      "node_modules/@playwright/test/cli.js",
      "test",
      "--config=playwright.finder-catalog.config.ts",
      "--workers=2",
    ],
    env,
  );
  console.log(
    "PASS actual browser → Next API → anonymous PostgreSQL RPC → results/product/media journey; no external resources used",
  );
} finally {
  if (next) {
    next.kill("SIGTERM");
    await new Promise((resolve) => {
      next.once("exit", resolve);
      setTimeout(resolve, 3000);
    });
  }
  if (facade) await new Promise((resolve) => facade.close(resolve));
  await pool.end();
}
