import Link from "next/link";
import { blogConfig } from "@/lib/blog/server";
import { SetupNotice } from "@/components/admin/blog/setup-notice";

export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!blogConfig()) return <SetupNotice />;
  const { error } = await searchParams;
  return (
    <section className="blog-panel admin-login">
      <h1>Activate your administrator account</h1>
      <p>Use the one-time code from your owner-issued invitation or password recovery email. This form cannot create an account or grant publishing access.</p>
      {error && <p role="alert" className="blog-notice">Activation failed. Check your code and matching passwords. If the code expired or was already used, ask the site owner for a new email and confirmation of your access.</p>}
      <form action="/api/blog/activate" method="post">
        <label>Email<input name="email" type="email" autoComplete="username" required maxLength={254} /></label>
        <label>Email type<select name="type" defaultValue="invite"><option value="invite">Administrator invitation</option><option value="recovery">Password recovery</option></select></label>
        <label>One-time email code<input name="token" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" required minLength={6} maxLength={10} /></label>
        <label>New password<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
        <label>Confirm password<input name="confirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required /></label>
        <p>Choose a unique password with at least 12 characters. Codes expire and work only once.</p>
        <button className="button button-primary" type="submit">Set password</button>
      </form>
      <Link href="/admin/blog/login">Back to sign in</Link>
    </section>
  );
}
