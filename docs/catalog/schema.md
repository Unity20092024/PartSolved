# Catalog schema review

All objects are new and catalog-prefixed. Existing blog/AI data, RLS, administrator membership and domain configuration are preserved. No real supplier/product records are included.

| Table | Purpose / identity |
| --- | --- |
| catalog_manufacturers | Manufacturer identity; unique internal slug |
| catalog_suppliers | Supplier identity, separate internal slug and optional website |
| catalog_categories | Four existing PartSolved category slugs |
| catalog_families | Ten existing Guided Finder family IDs, each linked to a category |
| catalog_sources | Documentation/file reference, optional evidence URL and review date |
| catalog_products | Manufacturer product group, family, source, publication state, immutable synthetic flag, optimistic graph revision |
| catalog_variants | Product-specific variant key, finish/color/handedness/material, source and verification date |
| catalog_identifiers | Manufacturer or alternate number; manufacturer-scoped exact uniqueness, original value and normalized lookup column |
| catalog_offers | Variant-to-supplier relation; supplier-scoped SKU uniqueness and documented availability; no invented price |
| catalog_dimensions | Named original measurement/unit, canonical numeric mm, source/date; one key per variant |
| catalog_compatibility | Sourced statement and optional target variant; verification required for public visibility |
| catalog_media | Product/optional variant, photo/drawing, private file, alt, attribution, rights reference, permission and upload states |
| catalog_purchase_arrangements | Private supplier purchasing/affiliate agreement provenance and approval state |
| catalog_purchase_links | Private offer/arrangement URL/tracking reference; no active customer checkout adapter |
| catalog_import_batches | Creator, source, synthetic flag, payload and independently computed canonical content hashes, status and timestamps |
| catalog_import_items | Durable product IDs, expected graph revisions and document fingerprints for safe rollback |

A manufacturer part number is unique within its manufacturer, not across every supplier. A supplier SKU is unique within its supplier. The same product variant can have several offers with different SKUs. Alternate identifiers are stored only as documented identifiers, never automatically treated as compatibility cross-references. Normalized collisions are intentionally not a database uniqueness rule: punctuation differences may be meaningful. Imports flag possible collisions for manual review; public results distinguish normalized candidates.

Every exposed table enables RLS and explicit role grants. Drafts, synthetic products, import audit records and purchasing agreements/links are unavailable to anonymous readers. Public child facts require a published nonsynthetic parent plus their own source/review where applicable. Permission-pending/revoked or incomplete media is private. Public compatibility links cannot reveal an unpublished target variant. The private storage bucket has administrator-only object access; the application serves a file only after authorization.

Graph saves and batch imports are transactional. Product/child modifications update revisions and return publication to draft; ownership cannot be reassigned between products/variants. Stale saves fail, leaving edits in the browser for backup. Publication requires real sourced manufacturer data and a verified variant/identifier; checks and triggers enforce this independently of disabled UI buttons. Synthetic cannot change to false after creation.

Search resolves exact/normalized number matches separately, selects/counts candidate IDs first, and hydrates only the requested page. Equality lookup columns and relationship/filter fields are indexed. Partial lookup requires at least three characters and is bounded; profile real catalog data before adding optional trigram/search infrastructure. All search SQL is parameterized and security invoker. No SECURITY DEFINER function is added.

The generated up migration has been exercised on disposable PostgreSQL with existing blog objects. The down migration refuses populated catalog records, audit history, stored media or a changed taxonomy row count; it never CASCADE-drops unrelated objects. A real populated-data rollback needs a separate reviewed archival/export plan, not automatic destructive reversal.
