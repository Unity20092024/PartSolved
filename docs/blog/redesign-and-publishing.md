# Blog visual update and publishing audit

## Actual current setup

The existing blog feature branch/PR is reused. A fresh read of the connected Vercel project found **no configured environment variables**. The connected Supabase account has **no PartSolved project**, and the execution environment has no database secrets or runtime variables. No unrelated project is suitable for reuse. No external resources or production settings were created or changed.

The publishing dashboard is **not live-ready or complete as a connected service**. PostgreSQL persistence has been verified locally; that does not establish that an Android customer can currently publish through the hosted preview.

| Feature | Code status | Hosted status |
| --- | --- | --- |
| `/admin/blog` | Private dashboard, counts, search/filter, New Article | Setup screen until connection exists |
| Administrator authentication | Supabase SSR cookies, server user/session and admin-membership checks, RLS | No PartSolved Auth project or administrator configured |
| Article editor | Mobile Tiptap, structured content, images, formatting, word count, exit warning | Accessible only after real administrator sign-in |
| Database | Shared Supabase migration history prepared; blog + AI migrations tested together locally | Not connected or applied to a hosted PartSolved database |
| Image upload/storage | Browser/server validation/compression, alt text, private bucket, safe deletion | Requires actual Auth/Storage connection and hosted verification |
| Save Draft | Serialized autosave, persistent SQL records, revision conflicts | Blocked until connection and writes are enabled |
| Preview | Authorized working-draft route, noindex | Requires sign-in and a saved persistent draft |
| Publish / Unpublish | Explicit published snapshots, atomic transitions, public removal | Blocked until connection and writes are enabled |
| Categories | Authorized persistent create/edit/delete and public filters | No categories seeded or fabricated |
| Featured articles | Explicit editor checkbox, published snapshot selection | Only actual published, flagged records appear; latest published update wins |
| SEO title/description | Per-article fields with title/excerpt fallbacks | Public article metadata requires a real published record |
| Slugs | Unique database constraint, editable slug, title-to-URL helper, published redirect history | No fake article URLs created |
| Sitemap | Reads public snapshots; excludes drafts/private previews and noncanonical articles | Static routes work; article entries appear after real publication |
| Scheduling | Snapshot worker with retries, UTC and idempotency | Disabled until a real recurring job is approved, connected and tested |

## Visual implementation

The blog index has a full-width photograph area, mobile image positioning, a bottom gradient, white BLOG title/subtitle and red accent. Cards have inset imagery, asymmetric corners, soft borders/shadows, real category labels, clamped excerpts, actual publication dates and **estimated** reading time calculated from article words at 220 words/minute. There are one/two/three columns on phones/tablets/wide screens. Hover motion is subtle and disabled for reduced-motion preferences.

No sample records are published. Empty states link to the existing Guides and Guided Finder. Filters come from real categories with published articles. Featured content requires an explicit publisher choice saved in a published snapshot.

### Hero asset status

The supplied homeowner-with-phone reference is visible in the conversation, but its original image file was not present among the accessible attachments. The existing licensed residential hardware photograph is used **temporarily**, with truthful alt text and no broken image URL. It does **not** satisfy the requested homeowner/phone subject. Replacing it with the exact supplied source file or a separately approved original image is still required. No unrelated third-party photo was silently substituted, and no unapproved generated image was used.

## One-time setup required

Follow [the shared-project setup](README.md). Owner approval is required before creating an external project or applying hosted migrations. Connect one PartSolved Supabase project shared with AI Photo Assist; review/apply repository migrations; configure private Storage and the real Auth administrator; set the environment values below securely in Vercel; then run hosted sign-in, persistence, image, authorization and publication tests before enabling writes.

Environment names only: `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `BLOG_ADMIN_ORIGIN`, `BLOG_WRITES_ENABLED`, `BLOG_SCHEDULER_READY`. Never put a secret in a `NEXT_PUBLIC_` variable or send keys in chat. Preview and production need their own correct admin origin. Scheduling stays off until its job is verified.

## Publishing your first article from Android, after setup passes

1. Open the **preview dashboard URL ending in `/admin/blog`** supplied with this PR and bookmark it. Once the owner approves a production release, the production dashboard path will be `https://www.partsolved.com/admin/blog`; this change does not put it on production automatically.
2. Sign in using the real invited administrator email and password. There is no default account or public registration.
3. Tap **New Article**. A private draft is created in PostgreSQL and opens in the editor.
4. Enter the article title and your real author name. Tap **Use title for URL** or enter a unique readable slug. Enter an excerpt.
5. Choose or create a real category under **Manage categories**. Suggested editorial categories are Window Hardware, Patio Door Hardware, Door Locks & Handles, Troubleshooting, and Measuring & Identification. They are suggestions, not pre-published records.
6. Open **Upload and manage images**, select a JPEG/PNG/WebP from your phone, add descriptive alt text, and upload it. Choose the uploaded featured image and enter its article-specific alt text. Insert inline images using **Insert an uploaded image**.
7. Write/paste the article body. Use H2/H3, lists, links and tables as needed. Set SEO title/description and related measurement guides in the expandable sections. Optionally select **Feature this article on the blog**.
8. Wait for **All changes saved**, or tap **Save draft**. Tap **Preview** to review the private server-rendered draft. Return to the editor to correct it.
9. Tap **Publish** and confirm. After the real backend transaction succeeds, the article becomes publicly accessible through its slug and the blog/sitemap query includes it. Verify the public page before sharing.
10. Edit/save later changes privately; tap **Publish** again to update the live snapshot. **Unpublish** removes public access. **Delete article** requires confirmation and retains media until it is safely removed from the library.

After this one-time setup, ordinary publishing requires neither GitHub edits nor Codex. Physical Android editor/upload testing and hosted Auth/Storage verification remain launch requirements; browser emulation is not physical-device proof.

## Screenshots and test specimens

Public-page screenshots show the actual current empty/unconfigured blog. Separate card-layout screenshots are visibly labeled **development-only, not published articles**, use existing approved local hardware images, and are never application routes or production data. They demonstrate the populated grid without inventing public content. See the PR for current screenshots, preview URL and check results.

- [Actual public blog, mobile](screenshots/blog-redesign-mobile.webp)
- [Actual public blog, desktop](screenshots/blog-redesign-desktop.webp)
- [Unpublished card specimens, mobile](screenshots/blog-card-specimens-mobile.webp)
- [Unpublished card specimens, desktop](screenshots/blog-card-specimens-desktop.webp)

Verification: ESLint, TypeScript and the production webpack build passed. Five server checks passed, including real local PostgreSQL persistence/RLS and published featured-flag behavior. The full Chromium suite passed **88 checks**, with **two pre-existing intentional duplicate-layout skips**. Blog screenshots and layout checks cover 320, 375, 390, 430, 768, 1024 and 1280px. The interrupted run during the environment restart was rerun successfully. Hosted login, storage and publication, security advisors against the real Supabase project, and physical Android verification remain unperformed because the project is not connected. These results do not establish a launch-ready publishing service.
