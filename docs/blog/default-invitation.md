# Default Supabase administrator invitation

This replaces the earlier custom-email-code activation instructions. Supabase's unchanged Invite user template is supported. No custom SMTP is required for an eligible organization-team test recipient. The site does not send invitations, create accounts, or grant administrator membership through any public endpoint.

Keep the Supabase Site URL at `https://www.partsolved.com`. Public signups were verified disabled on 13 November 2026; do not enable them. No database migration, RLS change, production deployment, invitation or email-template change is required by this patch.

## Preview activation from Android

1. Open the feature branch Preview's `/admin/blog/activate` page in Android Chrome. Sign into Vercel if prompted; keep deployment protection enabled. Expand **Testing in Preview? Open your original invitation here**.
2. Copy the **exact activation address displayed there** into Supabase → Authentication → URL Configuration → Redirect URLs. No wildcard, `/auth/callback`, or API route is needed. The browser return path is `/admin/blog/activate`; `/api/blog/activate/session` is a POST endpoint, not a Supabase redirect destination. Do not change the production Site URL. Adding an allowlist entry does not automatically change where the default email points.
3. Only after the owner approves sending, use Supabase Authentication → Users → Invite user for the approved email. Keep the default email template. Do not send a test invitation without approval.
4. In the email on Android, **long-press the confirmation button and copy its link before opening it**. Paste that original Supabase URL into the Preview helper, then tap **Open invitation in this environment**. The helper accepts only this project's HTTPS `/auth/v1/verify` invitation/recovery links, keeps the original verification token and type, and replaces `redirect_to` with this environment's fixed activation address. Supabase still verifies the original one-time credential and enforces its redirect allowlist.
5. After Supabase returns, tap **Continue invitation**. The page removes the URL fragment and exchanges the credential with Supabase through the same-origin server endpoint. Confirm the displayed email is yours. No credential is saved in localStorage/sessionStorage or sent to analytics. Private pages do not load Vercel Analytics.
6. If the page says **no administrator membership**, the invitation has authenticated the account but has not granted publishing permission. Have the owner make the specific grant below, then tap **Check administrator access again**. The ordinary authenticated session remains restricted by RLS while waiting; changing a URL or browser state does not grant access.
7. Enter and confirm a unique 12–128-character password, then tap **Set password**. The server rechecks the current Auth user and membership before updating the password. A successful setup signs out this session. Sign in again with the invited email/password at `/admin/blog/login`.

Default invitation links can return to the Site URL root. Once the owner separately approves merging/deploying this fix to production, a root invitation/recovery fragment is forwarded to private activation before Analytics loads. Until then, use the Preview helper; clicking a default production-targeted link is not a Preview test. Invitations issued with an explicit approved `redirectTo` to the Preview activation page can be opened directly without copying.

Expired, invalid or already-consumed links show a recovery message. Email scanners can consume confirmation links before a person opens them. Ask the owner for an appropriate fresh invitation/recovery email if necessary; no request or email is automatically sent. Never share an invitation link, token, password, or server key in chat or a screenshot.

## Owner-only administrator grant

After the invitation creates the Auth user, review its actual UUID and exact email in Supabase Authentication → Users. In the approved PartSolved project's SQL editor, run this with that **actual UUID and approved email**:

```sql
insert into blog_private.administrators(user_id)
select id from auth.users
where id = 'ACTUAL-INVITED-USER-UUID'::uuid
  and lower(email) = lower('ACTUAL-APPROVED-EMAIL')
  and invited_at is not null
on conflict (user_id) do nothing
returning user_id;
```

If no row is returned, check whether that exact user is already a member; do not broaden the query to all authenticated users. Granting membership must be an explicit owner action; invitation acceptance never performs this SQL. Do not insert users into `auth.users`, grant access based on user metadata, or add a public membership route. Removing the membership revokes publishing through the existing live membership/session helper and RLS. Database schema, grants and policies remain unchanged by this fix.

## Built-in email delivery eligibility

Supabase's built-in sender delivers only to the exact email addresses of the owning organization's team members. It has strict project-wide rate limits and best-effort delivery. Check Supabase Organization Settings → Team for the approved address before inviting. The connected MCP tools expose organization/project information but not that member list, and no delivery test can be claimed when sending is prohibited. If the address is not eligible, the built-in service may return `email_address_not_authorized`; this code change cannot bypass that provider restriction. Do not enable public signup or weaken email verification to work around it. No paid provider has been provisioned.

Official references: [SMTP restrictions](https://supabase.com/docs/guides/auth/auth-smtp), [implicit callback flow](https://supabase.com/docs/guides/auth/sessions/implicit-flow), [redirect allowlist](https://supabase.com/docs/guides/auth/redirect-urls).

## Verification boundaries

Unit tests exercise provider-verified identity checks, non-admin gating, rechecking revoked membership before password updates, project/redirect validation and expired credentials. Browser tests use explicitly synthetic credentials and mocked successful Auth responses; rejected refresh credentials also exercise the real configured Supabase endpoint. No real invitation is sent or consumed by these tests. Preview checks do not prove real email delivery, physical Android behavior, or a successful owner-account activation before the authorized invitation is tested.
