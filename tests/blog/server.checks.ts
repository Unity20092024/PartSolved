import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import {
  cleanBody,
  cleanDocument,
  emptyArticle,
  safeLink,
  validCanonical,
  jsonLd,
  wordCount,
} from "@/lib/blog/content";
import { assertBlogOrigin } from "@/lib/blog/server";
import { readJson, blogFailure } from "@/lib/blog/http";
import { ContentError } from "@/lib/blog/content";
import { databaseError, blogConfig } from "@/lib/blog/server";
import sharp from "sharp";
import {
  estimatedReadingMinutes,
  titleSlug,
  articleCategoryLabel,
} from "@/lib/blog/presentation";
import { normalizeArticleImage } from "@/lib/blog/images";
test("image normalization independently enforces formats, dimensions, byte limits and metadata removal", async () => {
  const source = await sharp({
    create: { width: 2400, height: 1200, channels: 3, background: "white" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Copyright: "local fixture" } } })
    .toBuffer();
  const image = await normalizeArticleImage(source),
    metadata = await sharp(image.data).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(image.info.width, 1600);
  assert.equal(image.info.height, 800);
  assert.equal(metadata.exif, undefined);
  await assert.rejects(
    normalizeArticleImage(Buffer.alloc(2_097_153)),
    /below 2 MiB/,
  );
  await assert.rejects(
    normalizeArticleImage(
      Buffer.from(
        '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>',
      ),
    ),
    /JPEG/,
  );
  await assert.rejects(normalizeArticleImage(Buffer.from("not an image")));
});
test("structured content rejects scripts, unsafe links, external images and invalid publishing data", () => {
  const document = emptyArticle("real-article");
  document.title = "Window help";
  document.author = "Actual author";
  document.excerpt = "How to inspect your window.";
  document.body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: "A window part." }],
      },
    ],
  };
  assert.equal(wordCount(cleanDocument(document, true).body), 3);
  assert.throws(() => cleanDocument(emptyArticle("draft"), true));
  assert.throws(() => cleanBody({ type: "script", text: "alert(1)" }));
  assert.throws(() =>
    cleanBody({
      type: "doc",
      content: [{ type: "image", attrs: { src: "https://attacker.test/x" } }],
    }),
  );
  assert.equal(safeLink("javascript:alert(1)"), null);
  assert.equal(safeLink("https://user:password@example.com/"), null);
  assert.equal(safeLink("/admin/blog"), null);
  assert.equal(
    safeLink("https://partsolved.com/blog/example"),
    "/blog/example",
  );
  assert.equal(
    safeLink("/guides/measurements#window-balances"),
    "/guides/measurements#window-balances",
  );
  assert.equal(validCanonical("https://partsolved.com/blog/x"), false);
  assert.equal(validCanonical("https://www.partsolved.com/blog/x"), true);
  assert(!jsonLd({ title: "</script><script>bad</script>" }).includes("<"));
  const raw = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        attrs: { onclick: "evil()" },
        content: [{ type: "text", text: "<script>visible text</script>" }],
      },
    ],
  };
  assert(!JSON.stringify(cleanBody(raw)).includes("onclick"));
});
test("article presentation uses real text, existing category labels and an explicit featured flag", () => {
  const doc = emptyArticle("draft");
  assert.equal(estimatedReadingMinutes(doc), null);
  doc.body = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [{ type: "text", text: Array(441).fill("word").join(" ") }],
      },
    ],
  };
  assert.equal(estimatedReadingMinutes(doc), 3);
  assert.equal(
    titleSlug("Measuring a Window's Latch!"),
    "measuring-a-window-s-latch",
  );
  assert.equal(
    articleCategoryLabel({ ...doc, hardware_category: "window-hardware" }),
    "Window Hardware",
  );
  assert.equal(cleanDocument({ ...doc, is_featured: true }).is_featured, true);
  assert.throws(() => cleanDocument({ ...doc, is_featured: "true" }));
});
test("mutation origins and bounded JSON fail closed", async () => {
  const oldUrl = process.env.SUPABASE_URL,
    oldKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  try {
    process.env.SUPABASE_URL = "https://fixture.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_secret_local-fixture";
    assert.equal(blogConfig(), null);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = `fixture.${Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url")}.fixture`;
    assert.equal(blogConfig(), null);
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY =
      "sb_publishable_local-fixture";
    assert(blogConfig());
  } finally {
    if (oldUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = oldUrl;
    if (oldKey === undefined)
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = oldKey;
  }
  assert.equal(blogFailure(new ContentError("Add a title.")).status, 422);
  assert.throws(
    () => databaseError({ code: "23505" }),
    (error: unknown) => (error as { status: number }).status === 422,
  );
  assert.throws(
    () => databaseError({ code: "40001" }),
    (error: unknown) => (error as { status: number }).status === 409,
  );
  process.env.BLOG_ADMIN_ORIGIN = "https://www.partsolved.com";
  assert.throws(() =>
    assertBlogOrigin(
      new Request("https://www.partsolved.com/api/blog/posts", {
        method: "POST",
        headers: { origin: "https://attacker.test" },
      }),
    ),
  );
  assert.doesNotThrow(() =>
    assertBlogOrigin(
      new Request("https://www.partsolved.com/api/blog/posts", {
        method: "POST",
        headers: {
          origin: "https://www.partsolved.com",
          host: "www.partsolved.com",
          "sec-fetch-site": "same-origin",
        },
      }),
    ),
  );
  await assert.rejects(
    readJson(
      new Request("http://local.test", { method: "POST", body: "null" }),
    ),
  );
  await assert.rejects(
    readJson(
      new Request("http://local.test", {
        method: "POST",
        body: "x".repeat(1_050_001),
      }),
    ),
  );
});
test(
  "real PostgreSQL migration: admin sessions, RLS, snapshots, conflicts, schedules and media references",
  { skip: !process.env.BLOG_TEST_DATABASE_URL },
  async () => {
    const url = new URL(process.env.BLOG_TEST_DATABASE_URL!);
    assert(
      ["localhost", "127.0.0.1"].includes(url.hostname) &&
        url.pathname === "/blog_test",
      "Only the disposable local blog_test database is permitted.",
    );
    const pool = new Pool({ connectionString: url.href });
    try {
      await pool.query(`drop schema if exists blog_private cascade; drop schema if exists ai_private cascade; drop schema if exists public cascade; create schema public; drop schema if exists auth cascade; drop schema if exists storage cascade;
      do $$ begin if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin; end if; if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if; if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if; end $$;
      create schema auth; create table auth.users(id uuid primary key); create table auth.sessions(id uuid primary key,user_id uuid,not_after timestamptz);
      create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;
      create function auth.uid() returns uuid language sql stable as $$select nullif(auth.jwt()->>'sub','')::uuid$$;
      grant usage on schema public,auth to anon,authenticated,service_role; grant execute on function auth.jwt(),auth.uid() to anon,authenticated,service_role;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]); create table storage.objects(id uuid primary key,bucket_id text,name text); alter table storage.objects enable row level security; grant usage on schema storage to anon,authenticated,service_role; grant select,insert,delete on storage.objects to authenticated;`);
      // Apply both feature histories to the SAME local database to detect conflicts.
      await pool.query(
        readFileSync(
          "supabase/migrations/20261109052500_ai_photo_accounting.sql",
          "utf8",
        ),
      );
      await pool.query(
        readFileSync(
          "supabase/migrations/20261109194101_blog_publishing.sql",
          "utf8",
        ),
      );
      const admin = randomUUID(),
        outsider = randomUUID(),
        session = randomUUID(),
        outsideSession = randomUUID(),
        id = randomUUID(),
        mediaId = randomUUID();
      await pool.query("insert into auth.users values($1),($2)", [
        admin,
        outsider,
      ]);
      await pool.query(
        "insert into auth.sessions(id,user_id) values($1,$2),($3,$4)",
        [session, admin, outsideSession, outsider],
      );
      await pool.query(
        "insert into blog_private.administrators(user_id) values($1)",
        [admin],
      );
      const asRole = async <T>(
        role: string,
        user: string | null,
        sid: string | null,
        run: (client: PoolClient) => Promise<T>,
      ) => {
        const client = await pool.connect();
        try {
          await client.query("begin");
          await client.query(`set local role ${role}`);
          await client.query(
            "select set_config('request.jwt.claims',$1,true)",
            [JSON.stringify({ sub: user, session_id: sid })],
          );
          const result = await run(client);
          await client.query("commit");
          return result;
        } catch (e) {
          await client.query("rollback");
          throw e;
        } finally {
          client.release();
        }
      };
      const manage = <T>(run: (client: PoolClient) => Promise<T>) =>
        asRole("authenticated", admin, session, run);
      const doc = {
        ...emptyArticle("window-will-not-stay-up"),
        title: "A real draft",
        author: "Test author (local fixture)",
        excerpt: "Local development fixture, never published externally.",
        body: {
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Check the balance." }],
            },
          ],
        },
      };
      await manage(async (client) => {
        assert.equal(
          (await client.query("select blog_is_admin() as allowed")).rows[0]
            .allowed,
          true,
        );
        await client.query(
          "insert into blog_posts(id,document) values($1,$2)",
          [id, doc],
        );
      });
      await asRole("anon", null, null, async (client) => {
        assert.equal(
          (
            await client.query(
              "select count(*)::int as n from blog_publications",
            )
          ).rows[0].n,
          0,
        );
        await assert.rejects(
          client.query("select * from blog_posts"),
          /permission denied/,
        );
      });
      await asRole(
        "authenticated",
        outsider,
        outsideSession,
        async (client) => {
          assert.equal(
            (await client.query("select blog_is_admin() as allowed")).rows[0]
              .allowed,
            false,
          );
          assert.equal(
            (await client.query("select count(*)::int as n from blog_posts"))
              .rows[0].n,
            0,
          );
        },
      );
      await assert.rejects(
        asRole("authenticated", outsider, outsideSession, (client) =>
          client.query("select blog_save_post($1,1,$2)", [id, doc]),
        ),
        /Administrator/,
      );
      await manage((client) =>
        client.query("select blog_transition($1,1,'publish',null)", [id]),
      );
      await manage((client) =>
        client.query("select blog_save_post($1,2,$2)", [
          id,
          { ...doc, title: "Private changed title", is_featured: true },
        ]),
      );
      assert.equal(
        (
          await asRole("anon", null, null, (client) =>
            client.query(
              "select document->>'title' as title from blog_publications",
            ),
          )
        ).rows[0].title,
        "A real draft",
      );
      await assert.rejects(
        manage((client) =>
          client.query("select blog_save_post($1,2,$2)", [id, doc]),
        ),
        /article changed/,
      );
      await manage((client) =>
        client.query(
          "select blog_transition($1,3,'schedule',now()+interval '1 hour')",
          [id],
        ),
      );
      await manage((client) =>
        client.query("select blog_save_post($1,4,$2)", [
          id,
          { ...doc, title: "Later private title" },
        ]),
      );
      await pool.query(
        "update blog_posts set scheduled_at=now()-interval '1 minute' where id=$1",
        [id],
      );
      assert.equal(
        (await pool.query("select blog_publish_due() as n")).rows[0].n,
        1,
      );
      assert.equal(
        (
          await pool.query(
            "select count(*)::int n from blog_publications where document->>'is_featured'='true'",
          )
        ).rows[0].n,
        1,
      );
      assert.equal(
        (await pool.query("select blog_publish_due() as n")).rows[0].n,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "select document->>'title' as title from blog_publications",
          )
        ).rows[0].title,
        "Private changed title",
      );
      assert.equal(
        (await pool.query("select document->>'title' as title from blog_posts"))
          .rows[0].title,
        "Later private title",
      );
      await assert.rejects(
        asRole("authenticated", admin, session, (client) =>
          client.query("select blog_publish_due()"),
        ),
        /permission denied/,
      );
      await manage((client) =>
        client.query(
          "insert into blog_media(id,path,alt,width,height,bytes,state) values($1,$2,'Local image',800,600,1000,'ready')",
          [mediaId, `${mediaId}.webp`],
        ),
      );
      await manage((client) =>
        client.query("select blog_save_post($1,6,$2)", [
          id,
          {
            ...doc,
            featured_image_id: mediaId,
            featured_alt: "A hardware component",
          },
        ]),
      );
      await assert.rejects(
        manage((client) =>
          client.query("select blog_mark_media_deleting($1)", [mediaId]),
        ),
        /still used/,
      );
      assert.equal(
        (
          await asRole("anon", null, null, (client) =>
            client.query("select count(*)::int n from blog_media"),
          )
        ).rows[0].n,
        0,
      );
      await manage((client) =>
        client.query("select blog_transition($1,7,'publish',null)", [id]),
      );
      assert.equal(
        (
          await asRole("anon", null, null, (client) =>
            client.query("select count(*)::int n from blog_media"),
          )
        ).rows[0].n,
        1,
      );
      await manage((client) =>
        client.query("select blog_transition($1,8,'unpublish',null)", [id]),
      );
      assert.equal(
        (
          await asRole("anon", null, null, (client) =>
            client.query("select count(*)::int n from blog_media"),
          )
        ).rows[0].n,
        0,
      );
      await manage((client) =>
        client.query("select blog_save_post($1,9,$2)", [id, doc]),
      );
      await manage((client) =>
        client.query("select blog_mark_media_deleting($1)", [mediaId]),
      );
      const failedId = randomUUID(),
        scheduledDoc = { ...doc, slug: "scheduled-retry-fixture" };
      await manage((client) =>
        client.query("insert into blog_posts(id,document) values($1,$2)", [
          failedId,
          scheduledDoc,
        ]),
      );
      await manage((client) =>
        client.query(
          "select blog_transition($1,1,'schedule',now()+interval '1 hour')",
          [failedId],
        ),
      );
      // Simulate an invalid scheduled snapshot to exercise the job's failure path.
      await pool.query(
        "update blog_posts set scheduled_at=now()-interval '1 minute',scheduled_document=jsonb_set(scheduled_document,'{title}','\"\"') where id=$1",
        [failedId],
      );
      assert.equal(
        (await pool.query("select blog_publish_due() as n")).rows[0].n,
        0,
      );
      assert.equal(
        (
          await pool.query(
            "select job_error is not null and job_retry_at>now() as retrying from blog_posts where id=$1",
            [failedId],
          )
        ).rows[0].retrying,
        true,
      );
      assert.equal(
        (await pool.query("select blog_publish_due() as n")).rows[0].n,
        0,
      );
      await manage((client) =>
        client.query(
          "select blog_transition($1,2,'schedule',now()+interval '1 hour')",
          [failedId],
        ),
      );
      await pool.query(
        "update blog_posts set scheduled_at=now()-interval '1 minute' where id=$1",
        [failedId],
      );
      assert.equal(
        (await pool.query("select blog_publish_due() as n")).rows[0].n,
        1,
      );
      assert.equal(
        (
          await pool.query(
            "select job_error is null and job_retry_at is null as recovered from blog_posts where id=$1",
            [failedId],
          )
        ).rows[0].recovered,
        true,
      );
      await pool.query("delete from auth.sessions where id=$1", [session]);
      await asRole("authenticated", admin, session, async (client) => {
        assert.equal(
          (await client.query("select blog_is_admin() as allowed")).rows[0]
            .allowed,
          false,
        );
        assert.equal(
          (await client.query("select count(*)::int n from blog_posts")).rows[0]
            .n,
          0,
        );
      });
      await assert.rejects(
        asRole("authenticated", admin, session, (client) =>
          client.query("select blog_save_post($1,10,$2)", [id, doc]),
        ),
        /Administrator/,
      );
    } finally {
      await pool.end();
    }
  },
);
