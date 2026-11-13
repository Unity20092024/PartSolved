# PartSolved publishing

**Connection follow-up:** the owner has now created the dedicated PartSolved project. See [the current connection status and owner setup steps](./supabase-connection.md). The earlier implementation audit below describes the original unconfigured state; it is not evidence that hosted publishing has passed its release gate.

This feature extends the existing Next.js site. The owner-created PartSolved Supabase project now has the reviewed migrations and private image bucket. Administrator provisioning, the server secret, Auth hardening and hosted publishing verification remain required; see the connection follow-up above. No sample articles, recurring publication job, merge or production deployment are part of this connection work. Public pages work without client JavaScript, and publishing writes default off.

## Connection required before launch

Use **one PartSolved Supabase project**, shared with AI Photo Assist: `apaojqpgsvikagwlfgci` (Part Solved, us-east-1). The original implementation had no project; the owner has since created this one and approved its connection. Do not use an unrelated project or provision a second database. No production environment or deployment has been configured by this follow-up.

1. The approved project already exists. Review costs, backups, storage allowances and availability before launch. Free projects can pause; do not promise uninterrupted scheduling on a paused project.
2. The complete current repository migration history has been reviewed and applied in order to that project, including `supabase/migrations/20261109194101_blog_publishing.sql`. Do not reapply it. The earlier AI accounting migration is unchanged and AI remains disabled. The blog migration uses Supabase-managed `auth` and `storage` schemas and creates a **private** `blog-media` bucket, not public storage.
3. Configure environment values through the hosting dashboard or local ignored `.env.local`, **never chat, Git, screenshots or a PR**. Names only:
   - `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`): project URL.
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: project publishable key. Intentionally public, never a secret/service key.
   - `SUPABASE_SECRET_KEY`: server-only secret key, used for image downloads **after authorization**. Reuse the existing AI server configuration.
   - `BLOG_ADMIN_ORIGIN`: exact dashboard origin, without trailing slash. Production uses `https://www.partsolved.com`; local development uses `http://127.0.0.1:3000`. Set a preview's exact origin separately. This does not change canonical URLs or domain redirects.
   - `BLOG_WRITES_ENABLED`: keep `false` until migration and authorization/storage checks pass.
   - `BLOG_SCHEDULER_READY`: keep `false` until the recurring publication job is approved, running and tested.
4. In Supabase Auth, disable public signups and invite the real administrator using the owner-controlled dashboard. Configure Auth URLs, password policy, email/SMTP and abuse controls/rate limits. The private activation form accepts the default Supabase invitation/recovery confirmation link; follow the [default-link activation and membership steps](./default-invitation.md). No editable email template is required. There is no public signup or public recovery-email request route. Review Vercel firewall limits for `/api/blog/auth` and `/api/blog/activate` before launch. No fabricated credentials or default password is supplied.
5. Grant membership to the actual Auth user UUID using the owner's SQL editor:

   ```sql
   insert into blog_private.administrators(user_id)
   values ('REPLACE-WITH-ACTUAL-AUTH-USER-UUID');
   ```

   Never use `user_metadata` to grant roles. Remove membership to revoke publishing immediately. The authorization helper also requires a current, unexpired Auth session. Use a fresh login after configuration.
6. Verify the complete hosted checklist below, then enable writes. No database connection = no fake successful Save/Publish operations.

## Data and authorization

- `blog_private.administrators` is not exposed to the API. A fixed-search-path private membership helper reads membership and current Auth session state. Its only definer privilege is that lookup. Other functions use invoker permissions and RLS.
- `blog_posts` contains private working documents, revisions and frozen schedules. `blog_publications` contains **separate published snapshots**. Autosave edits never alter the public snapshot. Publishing is an explicit action; scheduled publication publishes the saved scheduled snapshot even if a writer continues editing privately.
- `blog_categories`, `blog_media` and `blog_slug_history` have RLS. Anonymous readers see only published snapshots, referenced ready media, categories with published articles and redirects to currently published articles. Slug history prevents old published URLs from being reused by another article. Deleting an article removes its publication/history; unused media remains for deliberate cleanup.
- All application mutations verify the exact request origin, current Auth user, database administrator membership and write flag. Cookies are HTTP-only, SameSite=Lax and secure on HTTPS. The private pages repeat authorization on the server; the proxy only refreshes sessions, and is not the authorization boundary. Exposed tables enforce RLS independently of the UI.
- Save and transition functions lock the article and compare its revision. The editor serializes writes and flushes draft changes before Publish/Preview/Schedule. A conflicting save stops autosave, retains the text, and offers a JSON download. Refreshing **unsaved** text is not promised to recover it; browser exit warnings and download are provided. Successful autosaves persist in PostgreSQL.
- The rich-text body is structured JSON. An allowlist validates nodes, attributes and HTTP(S)/internal links. Public rendering creates escaped React elements, never arbitrary article HTML. JSON-LD escapes `<`. No scripts, pasted remote images, embedded HTML or iframe blocks are accepted. Tiptap loads only in the private editor.

## Images

Android/desktop file input accepts JPEG, PNG and WebP up to 10 MiB. Browser compression limits the request to 2 MiB; the server independently enforces the byte cap and decoded pixel/format limits, strips metadata, resizes to 1600 pixels, and re-encodes WebP. Alt text is required. Animated images are unsupported. Original filenames are discarded in favor of random UUIDs. No image is committed to Git.

Storage is private. `/blog/media/[id]` checks either a published media reference or administrator authorization before downloading the object with a server-only key. Responses are uncached to avoid publicly caching private previews or unpublished images. Next Image uses the already-optimized original dimensions without forwarding draft images to the public image optimizer. This favors privacy over CDN image caching; revisiting published-image caching needs a deliberate revocation strategy.

Deletion first locks and checks references in working drafts, schedules and published snapshots, then marks an unused object for deletion. Storage policies require that state. Failures remain visible and retryable; missing metadata after interrupted operations can require owner cleanup. The media manager initially shows 200 items and can load older images. Existing older image selections remain intact.

## Scheduling

Scheduling is **not** enabled merely by saving a timestamp. The migration provides `public.blog_publish_due()` but creates no recurring job. The owner must approve and configure a scheduler before enabling `BLOG_SCHEDULER_READY`.

For an approved Supabase project with Cron/pg_cron available, enable the extension using the official dashboard and run the reviewed [scheduler setup](./scheduler.sql) as the database owner. This adds no Vercel paid cron dependency. Confirm plan availability and any cost before enabling it. An external reliable worker calling the service-role RPC is another option, but none is provisioned here.

The job handles up to 50 due articles per run, runs every minute, compares UTC timestamps, locks due rows with `SKIP LOCKED`, and is idempotent. Repeated execution does not republish completed schedules. Errors retain the schedule, record `job_error`, and retry after five minutes so failed posts do not monopolize each batch. Inspect failed jobs and articles regularly; this release does not send monitoring emails. The dashboard shows failed scheduled posts and permits correction/rescheduling. The browser converts the selected local date/time to an ISO UTC timestamp; the dashboard also labels UTC times explicitly. Existing published content stays live until its scheduled update succeeds.

## SEO and existing website

- Canonical origin is fixed at `https://www.partsolved.com`, independent of preview/request hosts. The homepage has an explicit canonical; blog/article/category pages have their own canonical metadata. Apex links pasted into articles are normalized to the www identity.
- `/sitemap.xml` uses Next's metadata route and reads published snapshots through anonymous RLS. It excludes private workflows, drafts, previews, scheduled-only posts and articles canonicalized elsewhere. Publication timestamps, not draft autosaves, determine modification dates. Categories are included only when they contain indexable published articles. Empty/unconfigured blog pages are omitted; no fictional URLs are generated. Pagination reads batches beyond Supabase's default 1,000-row limit and fails explicitly before the sitemap size limit requires sharding.
- `/robots.txt` points to the www sitemap and excludes administration/APIs/private intake routes. Admin/preview pages additionally return noindex metadata/headers; preview deployments disallow crawling. Robots directives are **not** access control.
- Article/Breadcrumb JSON-LD uses actual stored author names and publication dates. Missing/unpublished articles return 404; historical published slugs redirect to the current published page.
- The intentional apex-to-www 308 redirect, Vercel domain configuration and existing Search Console verification mechanisms are untouched. No assumption was made about DNS-level verification. A sitemap does not guarantee indexing.
- No changes to hardware photographs, Guided Finder answers, upload/preview/measurements, video playback, AI activation/spending policy or supplier matching. A Blog navigation link is added.

## Development and verification

```sh
npm ci
npm run dev
npm run lint
npm run typecheck
npm run build
npm run test:blog
npm run test:e2e -- --workers=1
```

In restricted environments where Turbopack cannot start its worker listener, use `npm run build -- --webpack` and document that limitation. The Node tests skip database checks unless `BLOG_TEST_DATABASE_URL` points to a disposable local `blog_test` database. They deliberately reject hosted database URLs. See [local test setup](./testing.md).

### Hosted release gate (requires the actual connection)

- Apply migrations in a test project, run Supabase security advisors, verify only intended schemas are exposed, and review RLS/storage grants.
- Log in/out with a real invited administrator. Reject an authenticated non-admin and a revoked/expired session. Verify anonymous draft/API/media access fails, including direct PostgREST and Storage requests.
- Create, autosave, reload, preview, duplicate and delete drafts. Test two concurrent editors and a publish during editing. Publish/update/unpublish an article and verify public text, real metadata, canonical, JSON-LD, sitemap and 404 behavior.
- Upload from Android and desktop, test invalid/oversized images and private inline/featured previews, sharing-image access, reference-protected deletion and failed-upload cleanup.
- Test scheduling across time zones/DST, recurring job execution, retries, idempotency and recovery from a stopped job. Confirm the selected hosting/database plan remains available while schedules are pending.
- Test real mobile editor paste/keyboard behavior, screen reader operation, and existing Guided Finder/video workflows on physical devices. Automated Chromium emulation is not physical Android camera testing.

Do not call this launch-ready until those hosted checks pass. No merge or production deployment is part of this change.

## Official references reviewed

- [Supabase Next.js SSR](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Cron](https://supabase.com/docs/guides/cron)
- [Tiptap Next.js](https://tiptap.dev/docs/editor/getting-started/install/nextjs)
- [Next.js sitemap metadata routes](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Next.js robots metadata routes](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)

Dependencies are pinned in package.json/lockfile. No additional authentication system, database or external storage provider was introduced.
