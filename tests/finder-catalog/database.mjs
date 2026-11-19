import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
export const migrationPath =
  "supabase/migrations/20261119071641_finder_catalog_search.sql";
export async function asAnon(pool, sql, values = []) {
  const client = await pool.connect();
  try {
    await client.query("begin read only;set local role anon");
    return await client.query(sql, values);
  } finally {
    await client.query("rollback");
    client.release();
  }
}
export async function prepareDatabase(pool) {
  const migration = await readFile(migrationPath, "utf8");
  await pool.query(migration);
  const user = randomUUID(),
    session = randomUUID(),
    maker = randomUUID(),
    otherMaker = randomUUID(),
    supplier = randomUUID(),
    source = randomUUID();
  await pool.query("insert into auth.users(id)values($1);", [user]);
  await pool.query("insert into auth.sessions(id,user_id)values($1,$2)", [
    session,
    user,
  ]);
  await pool.query(
    "insert into blog_private.administrators(user_id)values($1)",
    [user],
  );
  await pool.query(
    "insert into catalog_manufacturers(id,name,slug)values($1,'LOCAL FIXTURE MAKER','finder-fixture-maker'),($2,'OTHER LOCAL FIXTURE MAKER','finder-fixture-other')",
    [maker, otherMaker],
  );
  await pool.query(
    "insert into catalog_suppliers(id,name,slug)values($1,'LOCAL FIXTURE SUPPLIER','finder-fixture-supplier')",
    [supplier],
  );
  await pool.query(
    "insert into catalog_sources(id,reference,verified_at)values($1,'ISOLATED LOCAL TEST EVIDENCE — NOT SUPPLIER DATA','2026-11-01')",
    [source],
  );
  const date = "2026-11-01T00:00:00Z";
  function product(
    n,
    manufacturer = maker,
    family = "window-locks",
    synthetic = false,
  ) {
    return {
      id: randomUUID(),
      revision: 0,
      slug: `finder-local-fixture-${n}`,
      title: `LOCAL FIXTURE — Sash lock ${n}`,
      description: "Isolated local test keeper hardware. Not real inventory.",
      manufacturer_id: manufacturer,
      family_id: family,
      source_id: source,
      verified_at: date,
      synthetic,
      variants: [
        {
          id: randomUUID(),
          key: "standard",
          finish: "",
          color: "",
          material: "",
          handedness: "unknown",
          source_id: source,
          verified_at: date,
          numbers: [
            {
              id: randomUUID(),
              kind: "manufacturer",
              value: `SYN-MPN-00${n}`,
              source_id: source,
              verified_at: date,
            },
          ],
          offers: [
            {
              id: randomUUID(),
              supplier_id: supplier,
              sku: n === 2 ? "SYN-MPN-001" : `SYN-SKU-00${n}`,
              availability: "unknown",
              source_id: source,
              verified_at: date,
            },
          ],
          dimensions: [
            {
              id: randomUUID(),
              key: "hole-spacing",
              label: "Screw-hole spacing",
              value: n,
              unit: "in",
              source_id: source,
              verified_at: date,
            },
          ],
          compatibility: [],
        },
      ],
    };
  }
  const records = [
    product(1),
    product(2, otherMaker),
    product(3),
    product(4, otherMaker),
    product(5, otherMaker, "rollers"),
    product(6),
    product(7, maker, "window-locks", true),
  ];
  const second = structuredClone(records[0].variants[0]);
  second.id = randomUUID();
  second.key = "second-verified";
  second.numbers[0].id = randomUUID();
  second.numbers[0].value = "SYN-SECOND-VARIANT";
  second.offers = [];
  second.dimensions[0].id = randomUUID();
  second.dimensions[0].value = 4;
  records[0].variants.push(second);
  const unverified = structuredClone(second);
  unverified.id = randomUUID();
  unverified.key = "unverified";
  unverified.source_id = null;
  unverified.verified_at = null;
  unverified.numbers[0].id = randomUUID();
  unverified.numbers[0].value = "SYN-UNVERIFIED";
  unverified.numbers[0].source_id = null;
  unverified.numbers[0].verified_at = null;
  unverified.dimensions = [];
  records[0].variants.push(unverified);
  const client = await pool.connect();
  async function admin(fn) {
    await client.query("begin;set local role authenticated");
    try {
      await client.query("select set_config('request.jwt.claims',$1,true)", [
        JSON.stringify({ sub: user, session_id: session }),
      ]);
      const out = await fn();
      await client.query("commit");
      return out;
    } catch (e) {
      await client.query("rollback");
      throw e;
    }
  }
  try {
    for (const p of records)
      await admin(() =>
        client.query("select catalog_save_product($1::jsonb)", [p]),
      );
    const approved = randomUUID(),
      pending = randomUUID();
    await pool.query(
      "insert into catalog_media(id,product_id,kind,path,alt,attribution,rights_reference,permission,state,width,height,bytes,source_id,verified_at)values($1,$2,'photo',$3,'Local fixture window sash lock','Existing user-approved local fixture asset','Local test use only','approved','ready',1280,853,10000,$4,$5),($6,$7,'photo',$8,'Unlicensed local fixture','','Permission not approved','pending','ready',1280,853,10000,null,null)",
      [
        approved,
        records[0].id,
        `${approved}.webp`,
        source,
        date,
        pending,
        records[1].id,
        `${pending}.webp`,
      ],
    );
    for (const p of records.slice(0, 5)) {
      const revision = (
        await pool.query("select revision from catalog_products where id=$1", [
          p.id,
        ])
      ).rows[0].revision;
      await admin(() =>
        client.query("select catalog_transition($1,$2,'published')", [
          p.id,
          revision,
        ]),
      );
    }
    async function search(
      number = "SYN-MPN-001",
      brand = "LOCAL FIXTURE MAKER",
      family = ["window-locks"],
      measurements = [],
      offset = 0,
      words = [],
    ) {
      const r = await asAnon(
        pool,
        "select public.catalog_find($1,$2,$3,$4,$5::jsonb,3,$6) value",
        [number, brand, family, words, JSON.stringify(measurements), offset],
      );
      return r.rows[0].value;
    }
    assert.equal(
      (await search("", "", ["window-locks"], [], 0, ["keeper"])).total,
      4,
    );
    const result = await search();
    assert.deepEqual(
      result.rows.map((r) => r.hit.product_id),
      records.slice(0, 3).map((p) => p.id),
    );
    assert.deepEqual(
      result.rows.map((r) => r.tier),
      [0, 1, 2],
    );
    assert.equal(result.total, 4);
    assert.equal(result.rows[0].hit.media.length, 1);
    assert.equal(result.rows[1].hit.media.length, 0);
    assert.equal((await search("", "", ["window-locks"])).total, 4);
    assert.equal(
      (await search("SYN-SECOND-VARIANT", "", [])).rows[0].hit.variant_id,
      second.id,
    );
    assert.equal((await search("SYN-UNVERIFIED", "", [])).total, 0);
    assert.equal((await search("SYN-MPN-006", "", [])).total, 0);
    assert.equal((await search("SYN-MPN-007", "", [])).total, 0);
    assert.equal((await search("NOT-IN-CATALOG", "", [])).total, 0);
    assert.equal((await search("", "", [])).total, 0);
    assert.equal((await search("synmpn001", "", [])).rows[0].tier, 3);
    assert.equal(
      (
        await search(
          "",
          "LOCAL FIXTURE MAKER",
          ["window-locks"],
          [{ key: "hole-spacing", value: 101.6, unit: "mm" }],
        )
      ).rows[0].hit.variant_id,
      second.id,
    );
    assert.equal((await search("", "", [], [], 0, ["keeper"])).total, 5);
    assert.equal(
      (await search(undefined, undefined, undefined, [], 3)).rows.length,
      1,
    );
    await assert.rejects(
      asAnon(
        pool,
        'select catalog_find(p_measurements:=\'[{"key":"hole-spacing","value":-1,"unit":"mm"}]\')',
      ),
    );
    await assert.rejects(asAnon(pool, "select catalog_find(p_limit:=0)"));
    const permissions = (await asAnon(pool, "select id from catalog_media"))
      .rows;
    assert.deepEqual(
      permissions.map((x) => x.id),
      [approved],
    );
    await admin(async () => {
      const r = await client.query(
        "select catalog_find('SYN-MPN-006','','{}','{}','[]',3,0) value",
      );
      assert.equal(r.rows[0].value.total, 0);
    });
    const count = (await pool.query("select count(*) from catalog_products"))
      .rows[0].count;
    await pool.query(
      await readFile("supabase/rollback/finder-catalog-search.sql", "utf8"),
    );
    assert.equal(
      (await pool.query("select count(*) from catalog_products")).rows[0].count,
      count,
    );
    await pool.query(migration);
    console.log(
      "PASS Finder SQL: global priority, pagination/product deduplication, units, exact versus normalized, category/text discovery, missing measurements, no match, draft/synthetic/unverified exclusion, media rights, invoker behavior and reversible function migration",
    );
    return { records, approved, pending, source };
  } finally {
    client.release();
  }
}
