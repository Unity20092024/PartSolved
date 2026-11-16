# Protected Preview publishing checks

## Setup status — 16 November 2026

The owner has accepted the invitation, granted the verified Auth user administrator membership, set a password and reached the private dashboard. Read-only checks confirmed the exact approved account's membership, RLS on all application tables, no anonymous draft read/insert or publishing RPC permission, no ordinary authenticated membership insertion, and private WebP-only image storage.

The existing server secret is configured for Preview. Its value was not retrieved or printed. `BLOG_WRITES_ENABLED` is enabled **only for `feat/admin-invitation-link` in Preview** so the owner can exercise real persistent publishing. Scheduling remains disabled. No Production settings, domains, redirects, memberships, invitations, or product features were changed by this setup step.

The active protected dashboard is:

https://partsolved-git-feat-admin-invitat-7b2df1-dees-projects-ac22187b.vercel.app/admin/blog

This documentation commit refreshes that branch's ordinary Git-integrated Preview build with the updated flag. It changes no application code and does not merge or deploy Production. No protection bypass link is used. The setup is **not declared launch-ready**; the real write/image/publication checks below remain to be completed by the signed-in owner. A configured secret's presence alone does not prove its validity for Storage downloads.

## Android verification

1. Reload the dashboard at the exact protected Preview URL above in the same Chrome browser. **New Article** should become available after the build is READY. Sign in again if required.
2. Tap **New Article**. Use a clearly labeled temporary Preview test title, your actual author name, a valid URL slug and an excerpt. Do not publish a sample as a real article.
3. Enter some body text, tap **Save draft** and wait for the saved confirmation. Return to the dashboard, reopen the article, and confirm the saved title and text survived navigation/reload. This is the persistent-save check.
4. Upload an image you own or may use, add accurate alt text, and verify private featured/inline previews. Check that draft article and image URLs are unavailable to a signed-out application visitor; Vercel protection alone is not a substitute for application authorization.
5. Use **Preview** to inspect the draft. Check headings, links, measurements/guide links and SEO fields. Keep test content clearly labeled.
6. When ready to test publication, explicitly publish the temporary record and inspect it on the **Preview** `/blog` and article route. Save an edit and verify the published snapshot remains unchanged until you publish the update. Then unpublish and confirm the article becomes unavailable publicly. Delete the test article and deliberately remove unused test media afterward. No automated publication or fake success is claimed.

Preview pages intentionally remain noindex, with no article URLs in their Preview sitemap. Published-only canonical sitemap inclusion must be verified in a production-like test run, then on `https://www.partsolved.com/sitemap.xml` after separately approved Production configuration. No production sitemap result is claimed from this Preview gate change.

If an operation fails, report the visible error and affected step, without including passwords, API keys or invitation links. Preserve the draft until the failure is understood. This verification does not require another invitation, a new database, paid SMTP, disabled RLS or a Preview protection bypass.
