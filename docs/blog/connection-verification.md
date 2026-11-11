# Supabase connection verification — 11 November 2026

Target: **Part Solved**, `apaojqpgsvikagwlfgci`, us-east-1. Branch: `feat/blog-supabase-connection`. Review: [PR #11](https://github.com/Unity20092024/PartSolved/pull/11).

## Passed

- Reviewed and applied both existing migrations in order. Hosted migration versions match the repository files; no schema edits were needed. All nine application tables have RLS enabled. AI is still disabled.
- Verified the private `blog-media` bucket, WebP-only content restriction, 2 MiB object limit, and three administrator-gated Storage policies.
- Hosted anonymous PostgREST reads of publications succeed with zero rows; draft reads return 401/42501. Anonymous users have no draft insert, membership-RPC or publish-RPC permission and cannot access the private schemas. Authenticated clients without a current admin session see zero drafts/media and `blog_is_admin() = false`. Ordinary authenticated users cannot invoke the scheduler or read the private membership table.
- Raw public access to the private bucket fails. No actual image upload is claimed by this check.
- Supabase security advisors: no warnings/errors, four informational notices for intentionally deny-all private tables. No permissive policy was added to silence them.
- Preview-only URL/publishable key/origin/write/scheduler configuration. No production variables were added. Writes and scheduling remain false.
- Vercel preview builds are READY. Authorized requests return the connected-empty `/blog` page, private sign-in and activation forms, noindex protections, canonical `https://www.partsolved.com/blog`, and a preview sitemap containing zero URLs. Deployment protection was retained.
- ESLint, TypeScript and the production webpack build passed. The initial restricted build could not read spawned TypeScript configuration; the same build passed outside the subprocess sandbox, and Vercel builds passed independently.
- Blog server checks: five passed, including activation input validation, invalid/expired-code rejection, non-admin denial, authorized password-setting behavior with mandatory session logout, image normalization and structured content/origin validation. Auth operations in these activation checks are mocked; they are not evidence of real email delivery or login.
- Full Chromium regressions: 88 passed, four failures from two old unconfigured-only assertions across desktop/mobile, two intentional duplicate-layout skips. After correcting those assertions for the connected empty/sign-in states, all four affected cases passed in a focused rerun. **92 unique browser cases passed across the run and rerun; this was not one clean full-suite run.** Existing finder/photo/measurement/video regressions passed.
- The activation UI passed keyboard/native required-field checks, cross-origin and oversized-request rejection, noindex checks and overflow checks at 320/375/390/430/768/1280px. Browser screenshots of real connected-empty and activation pages were captured under ignored `artifacts/blog-connection/`.

## Blocked / not established

- `SUPABASE_SECRET_KEY` is not yet configured. The connected Supabase tool exposes publishable keys, not server secrets or Auth administration/configuration. The Vercel tool can save environment values but cannot invent an absent server secret.
- Auth initially reports public signups enabled. The owner must disable them. RLS still independently denies publishing to non-administrators.
- The project has no Auth users or administrator memberships. No invitation has been sent, no default password exists, and the new activation form is not a registration endpoint. The owner must configure code-based invitation/recovery email templates and invite the approved email; membership must then be granted to that real invited user.
- Real administrator login/logout, email delivery/code activation, persistent draft creation/reload, image upload, publication/update/unpublication, and published article sitemap inclusion remain **unverified** until that setup is complete. No records, fake accounts, fabricated sessions or live sample articles were inserted to bypass these requirements.
- The existing disposable local PostgreSQL integration test was skipped because this environment has neither the database nor `BLOG_TEST_DATABASE_URL`. Schema/advisor/permission checks above ran against the actual approved Supabase project and do not replace the skipped integration test.
- Physical Android camera/editor behavior, screen-reader operation and Safari/Firefox are not established by Chromium viewport tests.
- Scheduling remains off; no recurring job was configured. Production remains unconnected and unchanged. No merge, production deploy, domain change, SEO rebuild or Kalshi modification was performed.

Follow [the owner setup and Android publishing steps](./supabase-connection.md), then finish the hosted release gate before enabling preview writes or requesting production approval.
