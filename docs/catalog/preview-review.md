# Protected catalog Preview review

PR: https://github.com/Unity20092024/PartSolved/pull/14

Branch: `feat/product-catalog-foundation`, isolated from the earlier blog/editor work.

Preview origin: https://partsolved-git-feat-product-catal-d337dd-dees-projects-ac22187b.vercel.app

## Open on Android

1. Open the Preview origin and complete its existing Vercel protection. No protection bypass link is created.
2. Open `/admin/blog/login` on that same origin and sign in with your existing PartSolved administrator account. There is no new registration, membership grant or invitation.
3. Login returns to the blog dashboard. Open `/admin/catalog` on the same origin, then choose the protected rehearsal link, or open `/admin/catalog/rehearsal` directly.
4. The clearly labeled rehearsal supports search, product reading, editing variants, media-rights review, CSV/XLSX mapping, transactional-style draft batches, exports and rollback in browser memory. Refresh resets it. It does not write to Supabase or create public products.
5. Search the labeled `DEMO-MPN-001` manufacturer number, `demompn001` normalized candidate, or `DEMO-B-001` supplier SKU. One manufacturer variant has two distinct supplier offers.
6. For import rehearsal, download the header-only template from the administrator view and follow `imports.md`. Tests use explicitly synthetic files under `tests/fixtures/catalog`; these are not supplier records.

The public `/catalog` explains that the real connection is not yet available. Real product pages remain unavailable until approved records and setup exist. The Preview sitemap remains empty and private routes are noindex. Synthetic rehearsal data cannot be published or indexed.

## Configuration and approval boundary

Only this branch's Preview has public Supabase connection settings, exact dashboard/login origins and disabled catalog/blog write flags configured. The existing global Preview server secret is reused without retrieving or exposing its value. Production, other branches, shared Supabase schemas, buckets, RLS and administrator membership are unchanged.

The shared migration is unapplied. Persistent hosted catalog saving is **not complete or verified**. After owner approval, apply the reviewed migration in an approved staging context, verify policies and Storage, connect the catalog flags, and perform authenticated hosted create/edit/import/upload/publication/unpublication tests. Do not turn on customer access or apply Production changes as part of interface review.

Hosted protected-page interaction has not been automated. Local browser tests exercise the same components with controlled synthetic adapters; local PostgreSQL tests exercise the real schema and security functions. No physical Android device test is claimed.
