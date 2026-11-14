import Link from "next/link";
import { blogConfig, sessionBlogClient } from "@/lib/blog/server";
import { SetupNotice } from "@/components/admin/blog/setup-notice";
import { InvitationActivation, type ActivationState } from "@/components/admin/blog/invitation-activation";
import { SITE_ORIGIN } from "@/config/site";

export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  const config = blogConfig();
  if (!config) return <SetupNotice />;
  const { error } = await searchParams;
  let state: ActivationState = "anonymous", email: string | undefined;
  try {
    const client = await sessionBlogClient();
    const { data: { user } } = await client.auth.getUser();
    if (user?.invited_at && user.email_confirmed_at && !user.is_anonymous) {
      email = user.email;
      const { data: allowed, error: membershipError } = await client.rpc("blog_is_admin");
      state = !membershipError && allowed === true ? "ready" : "membership_required";
    }
  } catch { /* Fail closed; the form cannot assign administrator membership. */ }
  return (
    <section className="blog-panel admin-login">
      <h1>Activate your administrator account</h1>
      <p>Use the default confirmation link in your owner-issued invitation. Invitation acceptance and administrator permissions are separate.</p>
      {error && <p role="alert" className="blog-notice">Your password could not be set. Check matching passwords and administrator access. If the session expired, request a new owner-issued invitation or recovery email.</p>}
      <InvitationActivation projectUrl={config.url} activationUrl={`${process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN}/admin/blog/activate`} initialState={state} initialEmail={email} />
      <Link href="/admin/blog/login">Back to sign in</Link>
    </section>
  );
}
