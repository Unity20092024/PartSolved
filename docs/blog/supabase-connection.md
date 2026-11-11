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
4. Configure Supabase Auth's Site URL to the preview origin during testing. Use the final preview activation URL below in the invitation and password recovery email templates. Include `{{ .Token }}` as a visible one-time code, rather than the default implicit-flow confirmation link:

   ```html
   <h2>PartSolved administrator invitation</h2>
   <p>Your one-time code: <strong>{{ .Token }}</strong></p>
   <p>Open the private activation address provided by the site owner, enter your email and this code, then choose your password.</p>
   <p>If you did not expect this invitation, ignore it. Never share this code.</p>
   ```

   The recovery template should use the same code instructions with a password-recovery heading. Set a short code expiry and review email rate limits. Owner-issued invitations/recovery only; there is no public registration or public invitation endpoint. Mail scanners cannot consume the code by prefetching a link because verification requires a deliberate form POST.
5. In Authentication → Users → Invite user, invite the owner's approved administrator email. Supabase's default email service may restrict delivery to organization-member addresses; configure an approved SMTP provider if delivery is restricted. Do not claim delivery succeeded without checking.
6. Grant **only that actual invited Auth user's UUID** membership using the project's SQL editor (or ask the agent to grant it after the invitation exists):

   ```sql
   insert into blog_private.administrators(user_id)
   select id from auth.users
   where id = 'REPLACE-WITH-ACTUAL-INVITED-USER-UUID'::uuid
     and invited_at is not null
   on conflict (user_id) do nothing;
   ```

   Do not grant all authenticated accounts access, derive roles from user metadata, or create users by inserting into `auth.users`. This step records authorization, not a default password.
7. On Android, open `PREVIEW_ORIGIN/admin/blog/activate`, enter the invited email, select **Administrator invitation**, enter the emailed code, and choose a unique password of 12–128 characters. Successful activation ends that session and requires a fresh password login at `/admin/blog/login`. If membership is not ready, the code expired, or email was scanned/consumed elsewhere, request a new owner-issued invitation/recovery code. Recovery uses the same screen with **Password recovery** selected. No code/password is placed in a URL or logged by the application.

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
