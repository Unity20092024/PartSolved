# Finder → Catalog integration

Stacked on PR #15 (`feat/mobile-finder-ux`), which is stacked on PR #14 (`feat/product-catalog-foundation`). Both were open/unmerged at audit. This branch does not rebuild or merge either system.

## Journey and routes

The existing Photo → Details → Review journey is unchanged. Review and Next Steps now offer **Search Catalog**, explaining that written details are sent to the server while photos remain in browser memory. `/find-part/results` reads the existing draft and calls the new read-only `/api/finder/catalog` POST endpoint. No customer detail is placed in URL query strings or persisted to a new table. The existing `/catalog/[slug]?variant=…` route shows the chosen record and variant.

The results screen starts with up to three distinct products, supports more candidates, explains why each appeared and what needs verification, and links to real product details. It distinguishes exact manufacturer numbers from supplier SKUs, normalized/alternate identifiers and broader candidates. No prices, stock assurances, supplier purchasing links, checkout, AI photo analysis, confidence percentages or guaranteed-fit claims are added.

A no-match response says: **We couldn't find a matching part in our catalog yet.** Customers can try another number, update details, browse related parts or open an existing identification guide. If even a family cannot be narrowed down, the screen also explains More Information Needed. An unconfigured catalog is a separate **not connected yet** state, not a claim that a real catalog was searched. Read errors/timeouts keep intake available and offer retry. Find Another Part confirms before clearing the current tab's intake. Refresh retains the existing clear recovery behavior.

## Ranking and measurements

The new `catalog_find` function ranks the entire eligible set before pagination and product deduplication:

1. Verified exact manufacturer part number.
2. Verified exact supplier SKU, with the recorded supplier named separately.
3. Exact manufacturer-name plus mapped hardware-family evidence.
4. Other supported candidates: normalized/alternate identifiers, the selected family/category, or literal catalog-text evidence when a family is unknown.

Exact and normalized identifiers can reveal a conflicting family; the result explicitly asks the customer to recheck it rather than hiding the conflict or declaring fit. Without identifier evidence, a known family constrains fallback candidates. Manufacturer names use trimmed case-insensitive equality, without invented brand aliases. Descriptive text contributes up to eight literal keywords, not a diagnosis. Catalog measurements only influence ordering within evidence tiers and generate discrepancy checks; they never discard a candidate or prove compatibility. The 0.000001 mm comparison threshold handles numerical representation, not a physical fit tolerance.

The original ten part-type IDs map explicitly to existing catalog family IDs. The catalog currently records a family, not an authoritative subtype for every variant; for example spiral/channel balances share a family. Results therefore require the specific type to be confirmed. Legacy category-only drafts retain their old category evidence; the newer friendly category groups expand to the corresponding existing families. Original URLs, identifiers and database relationships remain unchanged.

Only existing, relevant intake measurement IDs present on verified candidate records may be requested. One optional prompt appears at a time, with the existing illustrated diagram/guide, reference-point instructions, inches/mm, and **I Don't Know**. Inputs are never prefilled from a product specification. Unknown answers remain in the draft and do not repeat that prompt. These are comparison aids, not invented authoritative required-measurement or compatibility rules. Brand, markings, other manual details and per-type measurement history are preserved when results are edited.

## Privacy and access boundaries

- The request factory allowlists category, group, part type, manufacturer, entered number/markings, problem description, numeric/unknown measurements and page only. It never receives a File, Blob, photo URL, filename, supporting photo, annotation or AI result.
- The endpoint accepts bounded JSON (8 KiB), rejects photo/unknown fields, unsupported measurements/units and invalid pages, and refuses cross-site browser requests by comparing Origin to the browser-facing Host. This is a read-only abuse gate, not record authorization.
- Every catalog query uses the existing publishable/anonymous client without forwarding visitor cookies or using a service-role key. The browser keeps first-party cookies for Vercel deployment protection; the API ignores any incoming administrator session when querying the catalog. The security-invoker function preserves RLS and explicitly requires published, nonsynthetic products and verified variants/facts. Even an administrator invoking the function cannot use it to retrieve a draft product.
- Images must be approved, ready, sourced, dated and have a rights reference. Files use the existing authorized media route. A common-family illustration is never substituted for a product photograph. Product detail and purchasing behavior from PR #14 is preserved.
- API responses are private/no-store/noindex. Results are noindex and absent from sitemaps. No intake database, search-history table, customer-photo storage or request-body logging is added. The browser privacy notice remembers that written lookup was requested, so returning to earlier screens does not falsely promise those written details were never sent. Any separately approved existing AI flow remains independent and is not called by this integration.

## Migrations and setup blockers

The shared project was checked read-only and has only the existing AI-accounting and blog migrations. PR #14's catalog migration is still unapplied there. This branch prepares, but does **not apply**, an additional read-only function migration:

- Prerequisite: `20261118190527_product_catalog_foundation.sql` from PR #14.
- Integration: `20261119071641_finder_catalog_search.sql`.
- Reviewed reversal: `supabase/rollback/finder-catalog-search.sql`, which removes only the new function, not catalog records. Reverse this function before any foundation rollback.

No existing table, RLS policy, administrator membership, bucket, supplier integration or domain setting is changed by this integration migration. Function access is explicitly revoked from PUBLIC and granted to anon/authenticated as an intentional public-record read API; it is SECURITY INVOKER with an empty search path. No shared migration, bucket or data import has been applied by this task.

Before a hosted release, obtain approval for the migration sequence in an approved staging context, verify real Auth/PostgREST/Storage and security/performance advisors, and supply reviewed **published, nonsynthetic** supplier records with sourced identifiers/dimensions and authorized media. Realistic catalog-volume profiling is still required. Family membership or missing measurements cannot establish interchangeability. Supplier purchasing and fulfillment remain separate and disabled.

Reuse the existing PartSolved Supabase project and environment configuration: `SUPABASE_URL` (or its existing public URL alternative), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `CATALOG_ENABLED`. The search needs no new secret. Existing authorized private product-image serving uses the existing server-only storage credential. `CATALOG_WRITES_ENABLED` may remain false. No second database or paid service is provisioned.

Automatic Git deployments are disabled **only for this integration branch** in `vercel.json`, alongside PR #15's existing hold. The branch is created directly at a guarded commit. No Preview or Production deployment or merge is authorized by this work.

## Local verification

The test-only runner requires a disposable loopback PostgreSQL database named exactly `catalog_test`. It refuses hosted URLs, runs the foundation's actual database tests, applies the candidate function locally, and seeds unmistakable LOCAL FIXTURE records. Some disposable records use nonsynthetic/published flags only to exercise the real public RLS path; separate synthetic/draft/unverified cases prove exclusion. These test modules are never imported by the application and are not shared seeds.

A loopback-only HTTPS adapter exposes only approved read operations against PostgreSQL under role `anon`; the actual Next server, application API, UI, product route and authorized media route run against it. It is a local PostgREST-compatible test adapter, not a fake production service or proof that hosted Supabase has been connected. Certificate/private fixture files live under ignored `artifacts/finder-catalog/local/`, isolated from browser-output cleanup. The runner starts with a real API smoke request and cleans up its own servers.

```sh
npm run lint
npm run typecheck
npm run build -- --webpack
npm run test:finder-catalog
npm run test:catalog
npm run test:ai
CATALOG_TEST_DATABASE_URL=postgresql://postgres:local-catalog-test-only@127.0.0.1:55432/catalog_test PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:finder-catalog:integration
```

The existing regression suite runs separately with `playwright.finder.config.ts` and the catalog connection disabled. Physical Android camera and actual Facebook in-app WebView tests are manual release checks; Chromium file-picker events and touch/viewport tests do not claim physical-device verification.

## Results

- Final ESLint, TypeScript and production build passed.
- Six Finder contract/unit tests, seven existing catalog unit/parser tests and the existing AI server test command passed. No real AI request was made.
- Existing regression suite: **90 passed, two intentional viewport-duplicate skips** (Guided Finder, photo controls/privacy, measurement flows, catalog management and Guides/video).
- Candidate migration and actual anonymous PostgreSQL query checks passed: global priority, variant/product deduplication, pagination, exact/normalized distinctions, unit conversion, category/text discovery, no match, missing dimensions, draft/synthetic/unverified exclusion, licensed-media projection and function rollback/reapply.
- Final real Next API/database/browser run: **12 passed** across desktop and mobile. The run covers licensed image serving, product details and explicit Finder return, privacy allowlisting, optional targeted measurements/Unknown, data retained on edits, service-error retry, no-match actions, reset/refresh and mobile overflow at 320/375/390/430/768/1280px.
- Disabled connection/recovery/noindex and no-photo Guided Finder checks: **four passed**.

Early checks caught an ambiguous SQL variable, an Origin gate that used Next's internal URL, and test infrastructure/selectors that needed correction. All corresponding final checks passed. Mobile native Back was observed to return to Review with the photo and answers intact; product pages now also provide an explicit **Back to Finder Results** link when an intake is active.

The screenshots below come from the final local production build and isolated test records. They are not evidence of a shared migration, hosted Supabase connection, supplier catalog accuracy or physical Android/Facebook camera testing.

## Complete mobile journey

![Photo preview](screenshots/photo.webp)

![Customer details](screenshots/details.webp)

![Review and written-details search](screenshots/review.webp)

![Catalog results from isolated local fixture records](screenshots/results.webp)
