// Destructive ONLY to the dedicated loopback catalog_test database. Never hosted.
import pg from "pg";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const connectionString = process.env.CATALOG_TEST_DATABASE_URL;
if (!connectionString)
  throw Error(
    "Set CATALOG_TEST_DATABASE_URL to a disposable loopback catalog_test database.",
  );
const url = new URL(connectionString);
assert.ok(["127.0.0.1", "localhost"].includes(url.hostname));
assert.equal(url.pathname, "/catalog_test");
const pool = new pg.Pool({ connectionString });
const client = await pool.connect();
const migration = await readFile(
    "supabase/migrations/20261118190527_product_catalog_foundation.sql",
    "utf8",
  ),
  blog = await readFile(
    "supabase/migrations/20261109194101_blog_publishing.sql",
    "utf8",
  ),
  down = await readFile("supabase/rollback/catalog-foundation.sql", "utf8");
const user = randomUUID(),
  session = randomUUID(),
  outsider = randomUUID(),
  otherSession = randomUUID();
async function role(name, fn, id = user, sid = session) {
  await client.query("begin");
  try {
    await client.query("set local role " + name);
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: id, session_id: sid }),
    ]);
    const value = await fn();
    await client.query("rollback");
    return value;
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}
async function admin(fn) {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: user, session_id: session }),
    ]);
    const value = await fn();
    await client.query("commit");
    return value;
  } catch (e) {
    await client.query("rollback");
    throw e;
  }
}
try {
  await client.query(`drop schema if exists blog_private cascade;drop schema public cascade;create schema public;drop schema if exists auth cascade;drop schema if exists storage cascade;
 do $$ begin if not exists(select 1 from pg_roles where rolname='anon')then create role anon nologin;end if;if not exists(select 1 from pg_roles where rolname='authenticated')then create role authenticated nologin;end if;if not exists(select 1 from pg_roles where rolname='service_role')then create role service_role nologin bypassrls;end if;end $$;
 grant usage on schema public to anon,authenticated,service_role;
 create schema auth;create schema storage;grant usage on schema auth,storage to anon,authenticated,service_role;
 create table auth.users(id uuid primary key);create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
 create function auth.uid()returns uuid language sql stable as $$select (nullif(current_setting('request.jwt.claims',true),'')::jsonb->>'sub')::uuid$$;
 `);
  await client.query(`create function auth.jwt()returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text,owner_id text);
 alter table storage.objects enable row level security;grant select,insert,update,delete on storage.objects to authenticated;`);
  await client.query(blog);
  await client.query(migration);
  console.log("PASS migration applies locally with blog schema preserved");
  const rows = (
    await client.query(
      "select relname,relrowsecurity from pg_class join pg_namespace n on n.oid=relnamespace where n.nspname='public' and relname like 'catalog_%' and relkind='r'",
    )
  ).rows;
  assert.equal(rows.length, 16);
  assert.ok(rows.every((r) => r.relrowsecurity));
  await client.query("insert into auth.users(id)values($1),($2)", [
    user,
    outsider,
  ]);
  await client.query(
    "insert into auth.sessions(id,user_id)values($1,$2),($3,$4)",
    [session, user, otherSession, outsider],
  );
  await client.query(
    "insert into blog_private.administrators(user_id)values($1)",
    [user],
  );
  const manufacturer = randomUUID(),
    supplier = randomUUID(),
    supplier2 = randomUUID(),
    source = randomUUID();
  await admin(() =>
    client.query(
      "insert into catalog_manufacturers(id,name,slug)values($1,'LOCAL TEST MANUFACTURER','local-test-maker');",
      [manufacturer],
    ),
  );
  await admin(() =>
    client.query(
      "insert into catalog_suppliers(id,name,slug)values($1,'LOCAL TEST SUPPLIER ONE','local-one'),($2,'LOCAL TEST SUPPLIER TWO','local-two')",
      [supplier, supplier2],
    ),
  );
  await admin(() =>
    client.query(
      "insert into catalog_sources(id,reference,verified_at)values($1,'LOCAL SYNTHETIC TEST PROVENANCE',now())",
      [source],
    ),
  );
  const verified_at = "2026-11-01T00:00:00Z";
  const product = (synthetic = true) => ({
    id: randomUUID(),
    revision: 0,
    slug: "local-" + randomUUID(),
    title: "LOCAL TEST — NOT LIVE INVENTORY",
    description: "Disposable test record",
    manufacturer_id: manufacturer,
    family_id: "rollers",
    source_id: source,
    verified_at,
    synthetic,
    variants: [
      {
        id: randomUUID(),
        key: "standard",
        finish: "Test finish",
        color: "",
        material: "",
        handedness: "unknown",
        source_id: source,
        verified_at,
        numbers: [
          {
            id: randomUUID(),
            kind: "manufacturer",
            value: "LOCAL-" + randomUUID(),
            source_id: source,
            verified_at,
          },
        ],
        offers: [
          {
            id: randomUUID(),
            supplier_id: supplier,
            sku: "ONE-" + randomUUID(),
            availability: "unknown",
            source_id: source,
            verified_at,
          },
          {
            id: randomUUID(),
            supplier_id: supplier2,
            sku: "TWO-" + randomUUID(),
            availability: "unknown",
            source_id: source,
            verified_at,
          },
        ],
        dimensions: [
          {
            id: randomUUID(),
            key: "test-spacing",
            label: "Synthetic test dimension",
            value: 1,
            unit: "in",
            source_id: source,
            verified_at,
          },
        ],
        compatibility: [],
      },
    ],
  });
  const save = (p) =>
    admin(() => client.query("select catalog_save_product($1::jsonb)", [p]));
  const doc = async (id) =>
    (await admin(() => client.query("select catalog_document($1) as d", [id])))
      .rows[0].d;
  let synthetic = product();
  await save(synthetic);
  let stored = await doc(synthetic.id);
  assert.equal(stored.variants[0].offers.length, 2);
  assert.notEqual(
    stored.variants[0].numbers[0].value,
    stored.variants[0].offers[0].sku,
  );
  await assert.rejects(
    admin(() =>
      client.query("select catalog_transition($1,$2,'published')", [
        stored.id,
        stored.revision,
      ]),
    ),
  );
  await assert.rejects(
    admin(() =>
      client.query("update catalog_products set synthetic=false where id=$1", [
        stored.id,
      ]),
    ),
  );
  assert.equal(
    (
      await role(
        "anon",
        () => client.query("select count(*)::int n from catalog_products"),
        null,
        null,
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(
    role(
      "anon",
      () => client.query("select catalog_save_product($1::jsonb)", [product()]),
      null,
      null,
    ),
  );
  await assert.rejects(
    role(
      "authenticated",
      () => client.query("select catalog_save_product($1::jsonb)", [product()]),
      outsider,
      otherSession,
    ),
  );
  assert.equal(
    (
      await role(
        "authenticated",
        () => client.query("select count(*)::int n from catalog_products"),
        outsider,
        otherSession,
      )
    ).rows[0].n,
    0,
  );
  console.log(
    "PASS multi-supplier identity, RLS, non-admin denial, immutable fixture label, publication guard",
  );
  // Real-data flag here is confined to disposable SQL tests to exercise public RLS;
  // these records never enter Supabase, a deployment, a sitemap or a seed script.
  const pub = product(false);
  pub.variants[0].numbers[0].value = "LOCAL-PN-001";
  pub.variants[0].offers[0].sku = "LOCAL-SUPPLIER-99";
  await save(pub);
  stored = await doc(pub.id);
  await admin(() =>
    client.query("select catalog_transition($1,$2,'published')", [
      stored.id,
      stored.revision,
    ]),
  );
  const search = async (q, filters = {}) =>
    (
      await role(
        "anon",
        () =>
          client.query("select catalog_search($1,$2::jsonb) as s", [
            q,
            filters,
          ]),
        null,
        null,
      )
    ).rows[0].s;
  assert.equal((await search("LOCAL-PN-001")).total, 1);
  assert.equal((await search("localpn001")).total, 1);
  assert.equal((await search("PN-00", { mode: "partial" })).total, 1);
  assert.equal((await search("LOCAL-SUPPLIER-99")).total, 1);
  assert.equal(
    (
      await search("", {
        manufacturer,
        supplier: supplier2,
        measurement: "test-spacing",
        min_mm: "25.4",
        max_mm: "25.4",
        finish: "Test finish",
      })
    ).total,
    1,
  );
  assert.equal((await search("NOT-FOUND")).total, 0);
  const publicDoc = (
    await role(
      "anon",
      () => client.query("select catalog_document($1) as d", [pub.id]),
      null,
      null,
    )
  ).rows[0].d;
  assert.equal(publicDoc.manufacturer_name, "LOCAL TEST MANUFACTURER");
  assert.equal(publicDoc.variants[0].offers.length, 2);
  console.log(
    "PASS exact/normalized/partial/SKU/filter search, unit conversion, no-match, public projection",
  );
  const bad = product();
  bad.variants[0].dimensions[0].value = -1;
  await assert.rejects(save(bad));
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from catalog_products where id=$1",
        [bad.id],
      )
    ).rows[0].n,
    0,
  );
  const missing = product(false);
  missing.source_id = null;
  missing.verified_at = null;
  await save(missing);
  stored = await doc(missing.id);
  await assert.rejects(
    admin(() =>
      client.query("select catalog_transition($1,$2,'published')", [
        stored.id,
        stored.revision,
      ]),
    ),
  );
  const dup = product();
  dup.variants[0].numbers[0].value = "LOCAL-PN-001";
  await assert.rejects(save(dup));
  stored = await doc(pub.id);
  const stale = structuredClone(stored);
  await save(stored);
  await assert.rejects(save(stale), { code: "40001" });
  assert.equal((await search("LOCAL-PN-001")).total, 0);
  const media = randomUUID();
  await admin(() =>
    client.query(
      "insert into catalog_media(id,product_id,kind,path,alt,rights_reference,state,width,height,bytes)values($1,$2,'drawing',$3,'Local test drawing','Owned test asset','ready',10,10,100)",
      [media, pub.id, media + ".webp"],
    ),
  );
  stored = await doc(pub.id);
  await admin(() =>
    client.query("select catalog_transition($1,$2,'published')", [
      stored.id,
      stored.revision,
    ]),
  );
  assert.equal(
    (
      await role(
        "anon",
        () => client.query("select count(*)::int n from catalog_media"),
        null,
        null,
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(
    admin(() =>
      client.query(
        "update catalog_media set permission='approved' where id=$1",
        [media],
      ),
    ),
  );
  await admin(() =>
    client.query(
      "update catalog_media set permission='approved',source_id=$2,verified_at=$3 where id=$1",
      [media, source, verified_at],
    ),
  );
  stored = await doc(pub.id);
  await admin(() =>
    client.query("select catalog_transition($1,$2,'published')", [
      stored.id,
      stored.revision,
    ]),
  );
  assert.equal(
    (
      await role(
        "anon",
        () => client.query("select count(*)::int n from catalog_media"),
        null,
        null,
      )
    ).rows[0].n,
    1,
  );
  console.log(
    "PASS atomic validation/duplicate rollback, revision conflicts, draft-on-edit, media permission restrictions",
  );
  const batch = randomUUID(),
    imported = product();
  await admin(() =>
    client.query("select catalog_import($1,$2,$3,true,$4::jsonb)", [
      batch,
      "a".repeat(64),
      source,
      JSON.stringify([imported]),
    ]),
  );
  await admin(() =>
    client.query("select catalog_import($1,$2,$3,true,$4::jsonb)", [
      batch,
      "a".repeat(64),
      source,
      JSON.stringify([imported]),
    ]),
  );
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from catalog_import_items where batch_id=$1",
        [batch],
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(
    admin(() =>
      client.query("select catalog_import($1,$2,$3,true,$4::jsonb)", [
        batch,
        "b".repeat(64),
        source,
        JSON.stringify([imported]),
      ]),
    ),
  );
  await admin(() =>
    client.query("select catalog_rollback_import($1)", [batch]),
  );
  await admin(() =>
    client.query("select catalog_rollback_import($1)", [batch]),
  );
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from catalog_products where id=$1",
        [imported.id],
      )
    ).rows[0].n,
    0,
  );
  const batch2 = randomUUID(),
    edited = product();
  await admin(() =>
    client.query("select catalog_import($1,$2,$3,true,$4::jsonb)", [
      batch2,
      "c".repeat(64),
      source,
      JSON.stringify([edited]),
    ]),
  );
  await admin(() =>
    client.query(
      "update catalog_variants set finish='Edited outside RPC' where product_id=$1",
      [edited.id],
    ),
  );
  await assert.rejects(
    admin(() => client.query("select catalog_rollback_import($1)", [batch2])),
  );
  assert.equal(
    (
      await client.query(
        "select count(*)::int n from catalog_products where id=$1",
        [edited.id],
      )
    ).rows[0].n,
    1,
  );
  console.log(
    "PASS transactional draft imports, idempotent retry, safe rollback and direct-edit protection",
  );
  await assert.rejects(
    admin(() =>
      client.query("update catalog_variants set product_id=$2 where id=$1", [
        synthetic.variants[0].id,
        pub.id,
      ]),
    ),
  );
  const retryBatch = randomUUID(),
    retryProduct = product();
  await admin(() =>
    client.query("select catalog_import($1,$2,$3,true,$4::jsonb)", [
      retryBatch,
      "d".repeat(64),
      source,
      JSON.stringify([retryProduct]),
    ]),
  );
  const changed = structuredClone(retryProduct);
  changed.title += " changed payload";
  await assert.rejects(
    admin(() =>
      client.query("select catalog_import($1,$2,$3,true,$4::jsonb)", [
        retryBatch,
        "d".repeat(64),
        source,
        JSON.stringify([changed]),
      ]),
    ),
  );
  await assert.rejects(client.query(down));
  await client.query("rollback");
  await client.query(
    "delete from catalog_media;delete from catalog_products;delete from catalog_import_items;delete from catalog_import_batches;delete from catalog_sources;delete from catalog_manufacturers;delete from catalog_suppliers;",
  );
  await client.query(
    "update catalog_categories set name='Owner edited taxonomy' where id='window-hardware'",
  );
  await assert.rejects(client.query(down));
  await client.query("rollback");
  await client.query(
    "update catalog_categories set name='Window Hardware' where id='window-hardware'",
  );
  await client.query(down);
  assert.equal(
    (await client.query("select to_regclass('public.catalog_products') as t"))
      .rows[0].t,
    null,
  );
  assert.ok(
    (await client.query("select to_regclass('public.blog_posts') as t")).rows[0]
      .t,
  );
  await client.query(migration);
  console.log(
    "PASS refusal to destroy populated data; clean down/up preserves blog objects",
  );
  console.log("ALL LOCAL DATABASE CHECKS PASSED");
} finally {
  client.release();
  await pool.end();
}
