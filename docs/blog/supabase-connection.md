# PartSolved Supabase connection

## Approved target and current setup

The dedicated project is **Part Solved**, reference `apaojqpgsvikagwlfgci`, region `us-east-1`. Use only this project. Do not use Kalshi or create a second database for AI Photo Assist.

This work is isolated on `feat/blog-supabase-connection`, [pull request #11](https://github.com/Unity20092024/PartSolved/pull/11). Preview protection is retained:

- [Preview blog](https://partsolved-git-feat-blog-supabase-b1a8a3-dees-projects-ac22187b.vercel.app/blog)
- [Private dashboard/sign in](https://partsolved-git-feat-blog-supabase-b1a8a3-dees-projects-ac22187b.vercel.app/admin/blog)
- [Invitation/recovery activation](https://partsolved-git-feat-blog-supabase-b1a8a3-dees-projects-ac22187b.vercel.app/admin/blog/activate)

The preview blog is connected but empty. The sign-in and activation forms are available; this does not mean a real administrator has already been invited or that publishing has been enabled.

On 11 November 2026 the two reviewed repository migrations were applied to this previously empty project: AI accounting followed by blog publishing. All nine application tables have RLS enabled. The `blog-media` bucket is private, allows WebP only, and limits each object to 2 MiB. AI remains disabled; no scheduler or recurring paid service was enabled. No sample articles or Auth users were created.

Hosted migration versions were aligned with the existing repository filenames (`20261109052500` and `20261109194101`) after the management tool assigned execution-time versions. Future CLI migration runs must see these as applied; do not reapply them. No schema SQL was changed during that bookkeeping correction.

The security advisor reported no warnings/errors. Four informational `rls_enabled_no_policy` notices concern private membership/accounting tables: these deliberately deny ordinary API clients and must not receive permissive policies just to silence the notices.

The connected tools support database migrations and Vercel configuration, but **do not expose Supabase Auth administration/configuration or server secret-key retrieval**. The following owner actions are still required. Never share a password, email code, token, or secret in chat, Git, screenshots, or a pull request.

## Owner-only secure setup

1. Open the dedicated [Supabase project](https://supabase.com/dashboard/project/apaojqpgsvikagwlfgci). Under Authentication → Sign In / Providers, disable new user signups. Keep email login enabled. Review Auth rate limits, password policy, email delivery and abuse controls. The initial live check found signups enabled; database membership still independently prevents public users from publishing.
2. In Project Settings → API Keys, copy the **server secret** directly into Vercel → PartSolved → Settings → Environment Variables as `SUPABASE_SECRET_KEY`. Use the **Sensitive** type, target **Preview**, and restrict it to `feat/blog-supabase-connection`. Do not use a `NEXT_PUBLIC_` prefix. Do not add production variables yet.
3. The agent configures `SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `BLOG_ADMIN_ORIGIN`, `BLOG_WRITES_ENABLED=false`, and `BLOG_SCHEDULER_READY=false` for that preview branch. `BLOG_ADMIN_ORIGIN` must be the actual stable branch preview origin. Public article canonicals remain `https://www.partsolved.com`.
4. Keep Supabase's Site URL at `https://www.partsolved.com`. The default Invite user template is supported by the new [default-link activation flow](./default-invitation.md). No custom template, emailed code or SMTP purchase is required for an eligible organization-team test recipient. Add only the exact Preview activation address documented in that guide to Redirect URLs; the allowlist does not automatically change a default invitation's target.
5. Once the owner authorizes sending, invite the approved email through Supabase Authentication → Users. Do not send invitations as part of automated testing. Built-in delivery is limited to organization-team addresses and rate limits; it is not guaranteed.
6. Independently grant membership to the real invited Auth user, after verifying the exact user UUID and email, using the owner-controlled SQL editor. Do not grant based on user metadata or expose a membership-grant route. See the reviewed SQL in the default-link guide.
7. On Android, follow the default confirmation link, verify the displayed account, then set a password after membership has been granted. For Preview, use the copied-link helper described in the guide so no production Site URL change is needed. Accepting an invitation alone grants no publishing permission. Credentials stay out of app URLs, browser storage and analytics; session cookies are HTTP-only. A fresh password login is required after setup.

## Release gate and hosted verification

After the private account, secret, Auth settings and preview are ready, verify admin/non-admin/revoked-session access, direct PostgREST draft privacy, Storage privacy and same-origin mutations. Only then set `BLOG_WRITES_ENABLED=true` **on the preview branch** and rebuild the preview. Keep scheduling and AI off.

With a clearly labeled temporary test article, verify New Article → Save draft → reload → upload JPEG/PNG/WebP → private Preview → Publish → `/blog` and article HTML → edit/save (public snapshot unchanged) → Publish update → Unpublish (public article 404, image private again). Delete test data and unused media afterward. Do not leave test articles published as real content.

Preview deployments intentionally return an empty sitemap and disallow indexing. Verify article sitemap inclusion in a local production-like run connected to the same database, without `VERCEL_ENV=preview`; do not weaken preview noindex protections. Production settings, apex redirect, Google verification and live domain bindings remain untouched.

This connection is **not launch-ready** until real Auth, persistent publishing, Storage and mobile checks have passed. Local mocks, schema inspection and anonymous access checks alone cannot establish a working publishing service. A separate owner approval is required before merge or production configuration/deployment.

## Publishing the first real article from Android, after the release gate

1. Open the private dashboard address and sign in. If Vercel asks first, sign in to the authorized Vercel account; keep preview protection enabled.
2. Tap **New Article**. Enter a real title, author, URL slug and helpful excerpt; select or create a category.
3. Upload a featured image from your phone and write descriptive alt text. Add body text, headings, lists, links and any inline images. Set SEO title/description and relevant existing guide links.
4. Tap **Save draft**, wait for confirmation, then **Preview**. Review text, links, image cropping and metadata.
5. Tap **Publish**. Open the public article and `/blog` to confirm it appears. Future changes remain private until you publish the update. **Unpublish** removes the public snapshot while retaining the draft.
6. Scheduling remains unavailable until its separate recurring job has been approved and verified. Publishing to a preview does not make an article live at the production domain.
