# PartSolved catalog foundation

This feature is isolated from the blog/editor in `feat/product-catalog-foundation`, based on current main `ba6840a`. The earlier blog PR #13 was already merged when this audit began; this task did not merge it. No shared migration, Supabase resource change, Production configuration/deployment or supplier scraping is authorized by this feature.

## What is ready and what is blocked

Application code and a tested candidate migration support persistent normalized catalog records, public verified-record search/detail pages, the existing private administrator identity, product/variant editing, provenance, media rights, CSV/XLSX mapping, transactional draft imports, safe rollback and paged JSON export. Public catalog routes read no data until `CATALOG_ENABLED=true`; writes additionally need `CATALOG_WRITES_ENABLED=true`.

**The shared database migration has not been applied.** The Preview's persistent catalog connection is therefore intentionally disabled. `/admin/catalog/rehearsal` is available only in Vercel Preview after existing administrator authorization. It reuses the actual UI with explicitly synthetic browser-memory records, not pretend database saves. Refresh clears that rehearsal. The real persistent backend is tested against disposable local PostgreSQL. Hosted persistent Save/Import/Publish/Storage verification remains a required step after the owner approves the migration.

No prices, actual supplier products, manufacturer cross-references, stock claims or affiliate destinations are seeded. Rehearsal identifiers/names use unmistakable DEMO/SYNTHETIC labels. Its original SVG is a development drawing, not a product photograph. No manufacturer images are scraped/downloaded.

## Schema and identity

See [schema and integrity](./schema.md), the generated candidate [up migration](../../supabase/migrations/20261118190527_product_catalog_foundation.sql), and guarded [down migration](../../supabase/rollback/catalog-foundation.sql).

One manufacturer product has one or more variants; variants have manufacturer/alternate identifiers and separate supplier offers. Each supplier can assign its own SKU. Exact values are retained, with generated case-folded exact and punctuation-normalized search columns. Normalized collisions are candidates, never interchangeability claims.

Verified measurements retain their original unit/value and a numeric millimeter value for filtering. A named measurement key is required for range filters. No provisional intake schema is treated as authoritative catalog compatibility. Only sourced, dated compatibility statements are public. Images/drawings require permission provenance, attribution, a ready upload and explicit permission approval before public display.

All sixteen new tables have RLS, explicit grants and indexed relationships. The existing `blog_is_admin()` helper checks real administrator membership and session state; no second role table, account or public signup route is created. API writes check configured same origin, authentication, membership and the catalog write flag. No service/secret key reaches browser code. Storage downloads use the existing server-only secret only after RLS/user authorization. The new private `catalog-media` bucket and policies are part of the **unapplied** migration; existing buckets/policies are not changed.

## Public routes

- `/catalog`: exact/normalized/partial part-number or supplier-SKU lookup; manufacturer, supplier, existing category/family, verified finish and named dimension filters; pagination and explicit No verified match. Search/filter pages remain noindex.
- `/catalog/[slug]`: published, real records only; image/drawing gallery, variant selection, manufacturer numbers, separate supplier SKUs, sourced dimensions/compatibility and real verification dates. Missing/unpublished/synthetic records return 404.
- Existing category pages gain a catalog-search link; current photo/Guided Finder/measurement navigation remains intact.
- Canonicals use `https://www.partsolved.com`. Product sitemap entries require the connection flag and published nonsynthetic rows. Preview sitemap behavior and blog entries are preserved.
- No purchasing button or checkout is enabled. Private arrangement/link tables are ready to record future reviewed purchasing/affiliate terms; exposing approved destinations requires a separately reviewed public adapter. Do not send users to test checkout URLs.

## Private catalog operation (after approval/connection)

1. Open `/admin/catalog` on the correct protected Preview and sign in using the existing administrator account. Login currently returns to the blog dashboard; reopen/bookmark the catalog URL afterward. No new invitation or SMTP setup is needed.
2. Add/review manufacturers and suppliers under **Manufacturers & suppliers**. Organization slugs are internal mapping keys, not part numbers or SKUs.
3. Add authorized documentation under **Sources**. Do not put credentials, private customer data or signed/private tokens in source references/URLs; referenced evidence can become public with published catalog facts.
4. Add a product draft, its family, manufacturer, variants and independently sourced identifiers/offers/dimensions. Leave genuinely unknown fields blank. Record verification dates only after actual evidence review.
5. Add photos/drawings through the private upload. Pending media is private. Record permission evidence, required attribution, source and review date, then explicitly approve it. Supported uploaded formats are JPEG/PNG/WebP (including raster drawings), up to 10 MiB in the picker, compressed client-side and bounded/decoded again server-side at 2 MiB. SVG/PDF uploads are not supported. Removal applies only to that unique catalog file; it does not remove other products' files.
6. Save and use **Preview product**. Saving product or graph/media changes returns a published record to draft. The database tracks graph revisions even for direct authorized edits; conflicts retain browser edits and offer an unsaved JSON backup.
7. Mark for review, then explicitly Publish only real, verified records. At least one sourced/dated variant and identifier is required. Synthetic records cannot be published or relabeled as real data. Unpublish preserves the working record.
8. Use the import guide below for supplier files. Imports never update existing records automatically or publish anything. Export complete nested records plus lookup collections in bounded JSON pages; choose the **Export offset** for further pages. Each file includes total and next_offset. The export is an audit/backup, not an undocumented automatic JSON re-import format.

## Imports

See [mapping instructions and limits](./imports.md) and the [header-only CSV template](./import-template.csv). The admin download endpoint provides the same headers. A file is parsed and mapped before any import. New duplicate slugs, supplier SKUs or possible normalized manufacturer-number collisions require manual review. Explicit product slug/variant key grouping permits one variant to have offers from several suppliers without pretending their SKUs are manufacturer numbers.

Batches contain at most ten whole product graphs and commit atomically. Retrying a batch ID is idempotent only for the same canonical payload and administrator. Failed batches remain retryable; successful prior batches are listed. Safe rollback refuses edited, non-draft, missing, media-bearing or externally referenced records. Shared manufacturers/suppliers/provenance and import audit history remain. The down migration refuses populated catalog data; it is not an automatic deletion tool.

## Required approval and configuration

Use the **existing** PartSolved Supabase project `apaojqpgsvikagwlfgci`. No second database or paid service is needed. Do not apply the migration, create its bucket or turn on shared writes until owner approval.

Environment names only:

- Existing: `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, existing server-only `SUPABASE_SECRET_KEY` for authorized downloads.
- `BLOG_ADMIN_ORIGIN`: the exact feature-branch Preview origin for the reused login; branch-scoped, without changing existing branches or Production.
- `CATALOG_ADMIN_ORIGIN`: exact catalog dashboard origin. Preview can also use Vercel's trusted `VERCEL_BRANCH_URL`; request headers never choose the trusted origin.
- `CATALOG_ENABLED=false`, `CATALOG_WRITES_ENABLED=false` until reviewed setup and security checks pass.
- `CATALOG_TEST_DATABASE_URL`: disposable loopback `catalog_test` database ONLY. Never set this to a hosted database.

No credentials should be posted in chat or committed. The migration adds only catalog-prefixed tables/functions/policies and a private bucket. Back up before any later approved shared application, review rollback restrictions, apply in an approved staging context, inspect security advisors and verify Auth/PostgREST/Storage before enabling the write flag. No production release is included.

## Verification

```sh
npm ci
npm run lint
npm run typecheck
npm run build -- --webpack
npm run test:catalog
CATALOG_TEST_DATABASE_URL=postgresql://postgres:local-catalog-test-only@127.0.0.1:55432/catalog_test npm run test:catalog:db
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e -- --config=playwright.catalog.config.ts --workers=2
```

The local DB test refuses any non-loopback host or database name except `catalog_test`, then destructively recreates **only that disposable database's schemas**. It applies the existing blog migration before the catalog migration, checks RLS/authorization, public search, graph revisions, synthetic/publication/media guards, transactional imports/retry/rollback, down/up and preservation of blog objects. The browser rehearsal tests are controlled UI tests, not evidence of hosted persistence or physical Android camera testing. Original blog, intake, family photographs, Guided Finder and Guides/video regression tests remain available.

## Still needed from Strybuc

See [supplier handoff checklist](./supplier-handoff.md). Exact catalog matching remains separate from AI hardware-family assistance. Neither number normalization nor similar images authorize a replacement compatibility claim.
