# Catalog foundation audit — 18 November 2026

Base: current main `ba6840a` (includes the owner-merged blog/editor PR #13). Work is isolated in `feat/product-catalog-foundation`, with its own worktree/dependency install. No existing PR was merged by this task.

Next 16.4.5 App Router, React 19.3.1, TypeScript, Tailwind 4.3.4, Supabase JS 2.119.0/SSR 0.12.7. Four category slugs and ten Guided Finder family IDs already exist; they are reused as taxonomy. `src/types/catalog.ts` is only a future matching boundary, not live inventory. It is preserved. Photo intake, assistance, AI flags, measurements, blog/editor and Guides/video behavior remain separate.

Shared project `apaojqpgsvikagwlfgci` has the AI-accounting and blog migrations, no catalog tables. The private blog image bucket is WebP-only with a 2 MiB cap. Catalog uses the existing session/membership authorization and plans a separate private `catalog-media` bucket, not a second database or authentication system. All exposed catalog tables have RLS and explicit grants. Administrator membership remains owner-issued, with no public signup. The catalog migration is a candidate, not applied to the shared project.

Reviewed current Supabase changelog and RLS/Storage docs. CLI v3 is local by default; pinned CLI 3.2.0 was inspected before generating the migration filename. The XLSX reader's current API is `readSheet` (not the older default-export API), version 9.3.17 is pinned. Workbooks are preflighted for bounded ZIP/XML size, sparse cell bounds, formulas, external relationships and unsupported formats.

Plan: normalized manufacturer/product/variant/identifier/offer/source/measurement/compatibility/media/arrangement tables; verified number search with candidate distinctions; public product reading; existing-admin catalog management; CSV/XLSX field mapping and draft-only transactional batches; bounded export and safe rollback. Test database behavior locally before seeking approval for shared migration. Protected Preview rehearsal is explicitly synthetic and browser-memory only; it does not claim an applied Supabase catalog connection.
