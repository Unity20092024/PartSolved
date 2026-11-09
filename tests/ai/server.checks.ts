import { test, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { Pool } from "pg";
import { NextRequest } from "next/server";
import { validateAnalysis, confirmFamily } from "@/lib/ai/contract";
import {
  costMicros,
  verifyReservation,
  DEFAULT_MODEL,
  MAX_TEXT_TOKENS,
  MAX_OUTPUT_TOKENS,
  imageTokens,
  RESERVE_MICROS,
} from "@/lib/ai/policy";
import { normalizeImage, readLimitedBody } from "@/lib/ai/images";
import {
  issueReviewSession,
  readReviewSession,
  reviewEnabled,
  REVIEW_COOKIE,
  sameOrigin,
} from "@/lib/ai/access";
import { POST } from "@/app/api/hardware/analyze/route";
import {
  POST as reviewLogin,
  DELETE as reviewLogout,
} from "@/app/api/hardware/review/route";
import { emptyDraft } from "@/lib/intake";

const example = {
  outcome: "possibilities",
  candidates: [
    {
      familyId: "rollers",
      evidence: [
        {
          photo: 1,
          observation: "Two wheels are visible inside a metal housing.",
        },
      ],
    },
  ],
  markings: [],
  followUp: "opposite-side",
};
const good = () => structuredClone(example);
test("strict families, evidence references, unknowns and forbidden claims", () => {
  assert.equal(validateAnalysis(good(), 1).candidates[0].familyId, "rollers");
  for (const change of [
    (v: typeof example) => {
      v.candidates[0].familyId = "made-up-family";
    },
    (v: typeof example) => {
      v.candidates[0].evidence[0].photo = 2;
    },
    (v: typeof example) => {
      v.candidates[0].evidence[0].observation =
        "Exact replacement, compatible with brand X, $12.";
    },
    (v: typeof example) => {
      v.candidates[0].evidence[0].observation = "The roller is 25 mm wide.";
    },
    (v: typeof example) => {
      Object.assign(v, { sku: "fake" });
    },
    (v: typeof example) => {
      v.outcome = "unknown";
    },
    (v: typeof example) => {
      v.candidates.push(v.candidates[0]);
    },
  ]) {
    const value = good();
    change(value);
    assert.throws(() => validateAnalysis(value, 1));
  }
  assert.equal(
    validateAnalysis(
      {
        outcome: "unknown",
        candidates: [],
        markings: [],
        followUp: "clearer-photo",
      },
      1,
    ).outcome,
    "unknown",
  );
});
test("confirmation preserves manual details and all measurement groups", () => {
  const draft = {
    ...emptyDraft(),
    manufacturer: "Customer brand",
    markings: "AB12",
    finish: "white",
    orientation: "left" as const,
    problem: "My manual notes",
    measurementsByType: {
      "sash-cam-lock": {
        unit: "in" as const,
        values: { spacing: { value: "2 1/2", unknown: false } },
        notes: "Manual",
      },
    },
  };
  const next = confirmFamily(draft, "rollers");
  assert.equal(next.category, "door-parts");
  assert.equal(next.typesByCategory["door-parts"], "patio-roller");
  for (const key of [
    "manufacturer",
    "markings",
    "finish",
    "orientation",
    "problem",
    "measurementsByType",
  ] as const)
    assert.deepEqual(next[key], draft[key]);
  assert.equal(confirmFamily(draft, "invalid"), draft);
});
test("pinned cost bound covers all three images and maximum output plus margin", () => {
  const upper = verifyReservation(DEFAULT_MODEL);
  assert.equal(
    upper,
    costMicros(
      DEFAULT_MODEL,
      MAX_TEXT_TOKENS + 3 * imageTokens,
      MAX_OUTPUT_TOKENS,
    ),
  );
  assert.ok(upper * 1.25 < RESERVE_MICROS);
  assert.throws(() => verifyReservation("gpt-5.4-mini"));
  assert.throws(() => verifyReservation("__proto__"));
  assert.throws(() => verifyReservation("constructor"));
  assert.equal(costMicros(DEFAULT_MODEL, 1000, 1000), 5250);
});

let photoBytes: Buffer;
test("server decodes actual photos, strips metadata and rejects deceptive/oversized inputs", async () => {
  photoBytes = await sharp({
    create: { width: 300, height: 200, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata()
    .toBuffer();
  const normalized = await normalizeImage(
    new File([new Uint8Array(photoBytes)], "x.jpg", { type: "image/jpeg" }),
  );
  assert.equal((await sharp(normalized).metadata()).exif, undefined);
  for (const format of ["png", "webp"] as const) {
    const bytes = await sharp(photoBytes).toFormat(format).toBuffer();
    const clean = await normalizeImage(
      new File([new Uint8Array(bytes)], `part.${format}`, {
        type: `image/${format}`,
      }),
    );
    assert.equal((await sharp(clean).metadata()).format, "jpeg");
  }
  await assert.rejects(
    normalizeImage(
      new File([new Uint8Array(photoBytes)], "x.png", { type: "image/png" }),
    ),
  );
  await assert.rejects(
    normalizeImage(new File(["<svg/>"], "x.jpg", { type: "image/jpeg" })),
  );
  const large = await sharp({
    create: { width: 1537, height: 100, channels: 3, background: "white" },
  })
    .jpeg()
    .toBuffer();
  await assert.rejects(
    normalizeImage(
      new File([new Uint8Array(large)], "x.jpg", { type: "image/jpeg" }),
    ),
  );
  await assert.rejects(
    readLimitedBody(
      new Request("http://localhost", { method: "POST", body: "123456" }),
      5,
    ),
  );
});

const originalFetch = globalThis.fetch;
function reviewEnvironment() {
  Object.assign(process.env, {
    AI_ANALYSIS_ENABLED: "true",
    AI_LOCAL_REVIEW: "true",
    AI_SESSION_SECRET: "s".repeat(48),
    AI_IP_HASH_SECRET: "h".repeat(48),
    AI_REVIEW_ACCESS_TOKEN: "r".repeat(48),
    AI_ALLOWED_ORIGIN: "http://localhost:3000",
    OPENAI_API_KEY: "development-fixture-not-a-key",
    SUPABASE_URL: "https://ledger.test",
    SUPABASE_SECRET_KEY: "development-fixture",
  });
  delete process.env.VERCEL;
  delete process.env.VERCEL_ENV;
}
test("review sessions expire, reject tampering, and cannot enable production", () => {
  reviewEnvironment();
  const token = issueReviewSession();
  assert.ok(readReviewSession(token));
  assert.equal(readReviewSession(token + "x"), null);
  assert.equal(readReviewSession(token, Date.now() + 7 * 3600_000), null);
  process.env.VERCEL_ENV = "production";
  assert.equal(reviewEnabled(), false);
  assert.equal(readReviewSession(token), null);
  delete process.env.VERCEL_ENV;
});
test("origin checks use HTTP Host and reject cross-site/incorrect aliases", () => {
  reviewEnvironment();
  const request = (host: string, origin: string, site = "same-origin") =>
    new Request("http://internal-host:3000/api/hardware/review", {
      headers: { host, origin, "sec-fetch-site": site },
    });
  assert.equal(
    sameOrigin(request("localhost:3000", "http://localhost:3000")),
    true,
  );
  assert.equal(
    sameOrigin(request("evil.test", "http://localhost:3000")),
    false,
  );
  assert.equal(
    sameOrigin(request("localhost:3000", "https://evil.test")),
    false,
  );
  assert.equal(
    sameOrigin(
      request("localhost:3000", "http://localhost:3000", "cross-site"),
    ),
    false,
  );
});
function request(consent = true) {
  const form = new FormData();
  form.append(
    "photos",
    new File([new Uint8Array(photoBytes)], "part.jpg", { type: "image/jpeg" }),
  );
  return new NextRequest("http://localhost:3000/api/hardware/analyze", {
    method: "POST",
    body: form,
    headers: {
      origin: "http://localhost:3000",
      cookie: `${REVIEW_COOKIE}=${issueReviewSession()}`,
      "idempotency-key": randomUUID(),
      ...(consent ? { "x-photo-consent": "openai-v1" } : {}),
    },
  });
}
test("real API pipeline: no provider call without consent, accounting, permission or budget", async () => {
  reviewEnvironment();
  let providerCalls = 0;
  let mode = "success";
  let settlements = 0;
  globalThis.fetch = async (url, init) => {
    const target = String(url);
    if (target.includes("ledger.test")) {
      if (mode === "db-down") throw new Error("offline");
      if (target.endsWith("ai_take_rate_slot")) return Response.json(true);
      if (target.endsWith("ai_reserve_analysis"))
        return Response.json({ allowed: mode !== "budget", reason: "fixture" });
      settlements++;
      return Response.json(true);
    }
    assert.equal(target, "https://api.openai.com/v1/responses");
    providerCalls++;
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.tools, undefined);
    assert.equal(body.reasoning.effort, "none");
    assert.equal(body.input[1].content[0].detail, "high");
    if (mode === "timeout") throw new Error("timeout");
    return Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [
            {
              type: "output_text",
              text: JSON.stringify(
                mode === "invalid" ? { ...good(), sku: "bad" } : good(),
              ),
            },
          ],
        },
      ],
      usage: { input_tokens: 3000, output_tokens: 500 },
    });
  };
  try {
    assert.equal((await POST(request(false))).status, 400);
    assert.equal(providerCalls, 0);
    mode = "db-down";
    assert.equal((await POST(request())).status, 503);
    assert.equal(providerCalls, 0);
    mode = "budget";
    assert.equal((await POST(request())).status, 429);
    assert.equal(providerCalls, 0);
    mode = "success";
    const response = await POST(request());
    assert.equal(response.status, 200);
    assert.equal(
      (await response.json()).analysis.candidates[0].familyId,
      "rollers",
    );
    assert.equal(settlements, 1);
    mode = "invalid";
    assert.equal((await POST(request())).status, 502);
    assert.equal(settlements, 2);
    mode = "timeout";
    assert.equal((await POST(request())).status, 503);
    assert.equal(settlements, 2);
    process.env.VERCEL_ENV = "production";
    assert.equal((await POST(request())).status, 403);
  } finally {
    globalThis.fetch = originalFetch;
    delete process.env.VERCEL_ENV;
  }
});
test("reviewer login/logout enforce origin, strong credentials and persistent rate limits", async () => {
  reviewEnvironment();
  let allowed = true;
  globalThis.fetch = async () => Response.json(allowed);
  const login = (token: string, origin = "http://localhost:3000") =>
    new NextRequest("http://localhost:3000/api/hardware/review", {
      method: "POST",
      headers: { origin },
      body: new URLSearchParams({ token }),
    });
  try {
    assert.equal(
      (await reviewLogin(login("r".repeat(48), "https://evil.test"))).status,
      403,
    );
    assert.equal((await reviewLogin(login("wrong"))).status, 403);
    allowed = false;
    assert.equal((await reviewLogin(login("r".repeat(48)))).status, 429);
    allowed = true;
    const signedIn = await reviewLogin(login("r".repeat(48)));
    assert.equal(signedIn.status, 303);
    assert.equal(
      signedIn.headers.get("location"),
      "http://localhost:3000/find-part/guided",
    );
    const normalizedUrl = await reviewLogin(
      new NextRequest("http://internal-host:3000/api/hardware/review", {
        method: "POST",
        headers: { origin: "http://localhost:3000", host: "localhost:3000" },
        body: new URLSearchParams({ token: "r".repeat(48) }),
      }),
    );
    assert.equal(
      normalizedUrl.headers.get("location"),
      "http://localhost:3000/find-part/guided",
    );
    assert.match(signedIn.headers.get("set-cookie")!, /HttpOnly/i);
    assert.match(signedIn.headers.get("set-cookie")!, /SameSite=strict/i);
    assert.equal(
      (
        await reviewLogout(
          new NextRequest("http://localhost:3000/api/hardware/review", {
            method: "DELETE",
            headers: { origin: "http://localhost:3000" },
          }),
        )
      ).status,
      204,
    );
    globalThis.fetch = async () => {
      throw new Error("offline");
    };
    assert.equal((await reviewLogin(login("r".repeat(48)))).status, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Explicit opt-in local PostgreSQL only. No hosted connection/default URL.
const database = process.env.AI_TEST_DATABASE_URL;
test(
  "PostgreSQL: RLS/permissions, concurrent caps, replay, UTC boundaries, settlement and overrun stop",
  { skip: !database },
  async () => {
    const location = new URL(database!);
    assert.ok(
      ["localhost", "127.0.0.1"].includes(location.hostname),
      "Use an isolated LOCAL test database only",
    );
    assert.equal(
      location.pathname,
      "/ai_test",
      "This suite resets only the dedicated ai_test database",
    );
    const pool = new Pool({ connectionString: database, max: 12 });
    try {
      await pool.query(
        "do $$ begin if not exists(select 1 from pg_roles where rolname = 'anon') then create role anon; create role authenticated; create role service_role bypassrls; end if; end $$;",
      );
      await pool.query(
        "drop function if exists public.ai_usage_summary(); drop function if exists public.ai_take_rate_slot(text,text); drop function if exists public.ai_reserve_analysis(uuid,text,text,integer,text,bigint,bigint,bigint); drop function if exists public.ai_settle_analysis(uuid,integer,integer,bigint,text); drop schema if exists ai_private cascade;",
      );
      const migration = readdirSync("supabase/migrations").find((f) =>
        f.endsWith("_ai_photo_accounting.sql"),
      )!;
      await pool.query(
        readFileSync(`supabase/migrations/${migration}`, "utf8"),
      );
      const role = await pool.connect();
      try {
        await role.query("set role anon");
        await assert.rejects(role.query("select * from ai_private.attempts"));
        await assert.rejects(
          role.query("select public.ai_take_rate_slot($1, 'login')", [
            "a".repeat(64),
          ]),
        );
        await role.query("reset role");
        await role.query("set role authenticated");
        await assert.rejects(
          role.query("select public.ai_take_rate_slot($1, 'login')", [
            "a".repeat(64),
          ]),
        );
        await role.query("reset role");
      } finally {
        role.release();
      }
      const reserve = async (
        id = randomUUID(),
        session = randomUUID(),
        daily = 1_000_000,
        monthly = 10_000_000,
      ) => {
        const client = await pool.connect();
        try {
          await client.query("set role service_role");
          return (
            await client.query(
              "select public.ai_reserve_analysis($1,$2,$3,1,$4,30000,$5,$6) as result",
              [id, session, "a".repeat(64), DEFAULT_MODEL, daily, monthly],
            )
          ).rows[0].result;
        } finally {
          await client.query("reset role");
          client.release();
        }
      };
      assert.equal((await reserve()).reason, "disabled");
      await pool.query(
        "update ai_private.controls set enabled = true, daily_cap = 90000",
      );
      await assert.rejects(
        pool.query("update ai_private.controls set daily_cap = 1000001"),
      );
      await assert.rejects(
        pool.query("update ai_private.controls set monthly_cap = 10000001"),
      );
      const rateResults = await Promise.all(
        Array.from({ length: 8 }, () =>
          pool.query(
            "select public.ai_take_rate_slot($1,'analyze') as allowed",
            ["b".repeat(64)],
          ),
        ),
      );
      assert.equal(rateResults.filter((r) => r.rows[0].allowed).length, 5);
      const results = await Promise.all(
        Array.from({ length: 12 }, () => reserve()),
      );
      assert.equal(results.filter((r) => r.allowed).length, 3);
      assert.equal(
        Number(
          (
            await pool.query(
              "select sum(reserved_cost) as total from ai_private.attempts",
            )
          ).rows[0].total,
        ),
        90000,
      );
      assert.equal(
        (await pool.query("select public.ai_usage_summary() as usage")).rows[0]
          .usage.dayMicros,
        90000,
      );
      await pool.query("truncate ai_private.attempts");
      const id = randomUUID();
      assert.equal((await reserve(id)).allowed, true);
      assert.equal((await reserve(id)).reason, "duplicate");
      await pool.query("set role service_role");
      assert.equal(
        (
          await pool.query(
            "select public.ai_settle_analysis($1,1000,1000,5250,'completed') as ok",
            [id],
          )
        ).rows[0].ok,
        true,
      );
      assert.equal(
        (
          await pool.query(
            "select public.ai_settle_analysis($1,1000,1000,5250,'completed') as ok",
            [id],
          )
        ).rows[0].ok,
        true,
      );
      await pool.query("reset role");
      // Today's cost 5250, previous days count toward month but not today's allowance.
      await pool.query(
        "update ai_private.attempts set created_at = date_trunc('month', now() at time zone 'UTC') at time zone 'UTC' - interval '1 day'",
      );
      assert.equal(
        (await reserve(randomUUID(), randomUUID(), 30000, 30000)).allowed,
        true,
      );
      assert.equal(
        (await reserve(randomUUID(), randomUUID(), 30000, 30000)).reason,
        "budget",
      );
      await pool.query(
        "truncate ai_private.attempts; update ai_private.controls set daily_cap = 1000000",
      );
      const unresolved = randomUUID();
      assert.equal((await reserve(unresolved)).allowed, true);
      await pool.query(
        "update ai_private.attempts set created_at = date_trunc('month', now() at time zone 'UTC') at time zone 'UTC' - interval '1 day'",
      );
      assert.equal(
        (await reserve(randomUUID(), randomUUID(), 30000, 30000)).reason,
        "budget",
      );
      const carried = (
        await pool.query("select public.ai_usage_summary() as usage")
      ).rows[0].usage;
      assert.equal(carried.dayMicros, 30000);
      assert.equal(carried.monthMicros, 30000);
      assert.equal(carried.unreconciledRequests, 1);
      await pool.query(
        "select public.ai_settle_analysis($1,1000,1000,5250,'completed')",
        [unresolved],
      );
      assert.equal(
        (await reserve(randomUUID(), randomUUID(), 30000, 30000)).allowed,
        true,
      );
      await pool.query("truncate ai_private.attempts");
      // Previous-day cost counts toward current month. Fixed test clock is not needed
      // on day 1: move record into current month and use explicit monthly cap below.
      const session = randomUUID();
      const one = randomUUID();
      assert.equal((await reserve(one, session)).allowed, true);
      assert.equal((await reserve(randomUUID(), session)).reason, "rate");
      await pool.query(
        "update ai_private.attempts set created_at = now() - interval '2 minutes'",
      );
      assert.equal(
        (await reserve(randomUUID(), randomUUID(), 1000000, 30000)).reason,
        "budget",
      );
      await pool.query("set role service_role");
      assert.equal(
        (
          await pool.query(
            "select public.ai_settle_analysis($1,100000,1800,83100,'completed') as ok",
            [one],
          )
        ).rows[0].ok,
        false,
      );
      await pool.query("reset role");
      assert.equal(
        (await pool.query("select enabled from ai_private.controls")).rows[0]
          .enabled,
        false,
      );
      assert.equal((await reserve()).reason, "disabled");
    } finally {
      await pool.end();
    }
  },
);
after(() => {
  globalThis.fetch = originalFetch;
});
