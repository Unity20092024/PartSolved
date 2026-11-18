# Catalog verification — 18 November 2026

## Passed checks

- Dependency installation; one pinned production dependency added: `read-excel-file@9.3.17`.
- ESLint and TypeScript validation.
- Local Next.js webpack production build, including all existing routes.
- Vercel automatic protected Preview build for application commit `32cec54d42f3cd11ad7edb4c58313d6607b0def5`: READY. No manual Production deployment.
- Seven catalog unit/domain/parser tests, including separate manufacturer/SKU identity, exact/normalized/partial outcomes, unknown/invalid values, mapped CSV/XLSX, duplicate/formula/sparse/ZIP-header rejection, safe purchasing URL boundaries, CSRF/write gates, and rehearsal save/import/rollback behavior.
- Real candidate migration applied to disposable **local** PostgreSQL: sixteen RLS tables; authenticated administrator versus anonymous/non-admin access; two supplier SKUs for one manufacturer variant; public projections and search; millimeter conversion; invalid dimensions; optimistic revisions; draft-on-edit; media permission restrictions; synthetic publication prevention; atomic draft batches, canonical payload checks and idempotency; safe rollback and ownership protection; guarded down/up preserving blog objects. Rollback also refuses edited taxonomy.
- All eight existing blog server tests with their optional database test enabled against a separate disposable local `blog_test` database, including AI/blog migration coexistence, sessions/RLS, snapshots, schedules, media references, imported formatting and authorization.
- Existing AI server test command passed; no real OpenAI request was made.
- All sixteen catalog Playwright cases passed across desktop and touch-enabled mobile Chromium profiles. These cover search, no match, product/variant reading, add/edit, imports, exports, duplicate/error handling, media permission review/revocation, unauthorized mutation rejection, fixture exclusion, keyboard controls, and responsive layouts at 320, 375, 390, 430, 768 and 1280 pixels.

## Full browser regression and follow-up

The full suite ran 128 cases: **122 passed, four skipped, two failed initially**. The failures were an existing activation assertion hard-coded to port 3000 (the isolated app uses 3100), and a five-second mobile hydration timeout. The assertion now derives its expected origin from Playwright's base URL. Both activation scenarios were rerun in isolation on desktop and mobile; **all four isolated reruns passed**. No application activation change was needed.

The four skips are intentional: two owner-only greenhouse fixture cases lack the optional private fixture, and two mobile-profile repeats are already exercised by the desktop profile's multi-width tests. Existing Guided Finder, photo intake, all ten hardware photographs, measurement schemas, blog editor/reader, homepage and Guides/video tests otherwise passed.

## Scope and remaining checks

The browser rehearsal uses the actual application components with an explicitly synthetic browser-memory adapter. Local PostgreSQL exercises the real schema, security policies and transactional functions. These are not evidence of authenticated hosted persistent catalog CRUD or Storage success.

Read-only shared Supabase verification confirmed zero catalog tables, no catalog-media bucket, existing blog RLS enabled and private blog media. No shared migrations, bucket changes, membership grants, invitations, Production settings, existing PR merges or synthetic publications occurred.

Before a live catalog: obtain owner approval for the candidate migration and private bucket; verify in an approved staging context with Supabase Auth/PostgREST/Storage; test authenticated hosted save/import/upload/publish/unpublish; inspect security/performance advisors; load only approved supplier records and media; verify supplier purchasing agreements separately. Profile realistic catalog volumes before adding a partial-search index. Physical Android and authenticated hosted Preview interaction remain manual checks; no protection bypass was created.

Screenshots were captured from local synthetic rehearsals, not live supplier records. Mobile and desktop search, product and editor screenshots are retained under ignored `artifacts/catalog-review/` in the working environment.
