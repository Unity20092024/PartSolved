# Local blog tests

The database test uses a disposable local PostgreSQL 17 database named `blog_test`. It **destroys its test schemas** on each run and refuses non-loopback hosts or another database name. Never point it at real data. It emulates the Supabase-managed Auth/session and Storage tables needed by the migration; it is not a replacement for testing real Supabase Auth, PostgREST or Storage services.

Example local-only setup (test password, not a credential for any external service):

```sh
docker run --rm -d --name partsolved-blog-test-db \
  -p 127.0.0.1:55432:5432 \
  -e POSTGRES_PASSWORD=local-blog-test-only -e POSTGRES_DB=blog_test postgres:17-alpine
BLOG_TEST_DATABASE_URL=postgresql://postgres:local-blog-test-only@127.0.0.1:55432/blog_test npm run test:blog
docker stop partsolved-blog-test-db
```

The migration is executed against real PostgreSQL, with RLS-enabled roles and representative session claims. Tests cover anonymous/non-admin access, stale revisions, live snapshot isolation, scheduled snapshot isolation/idempotency, revoked sessions and referenced media deletion.

Browser tests use the actual editor component with an explicitly local intercepted API fixture. The fixture and navigation stub are under `tests/fixtures`, never public routes. These tests check editor behavior and mobile layout; they do **not** assert that hosted sign-in/storage has been connected. Screenshots are labeled development drafts and saved under `test-results` (ignored by Git).
