import Link from "next/link";
import { blogConfig } from "@/lib/blog/server";
import { SetupNotice } from "@/components/admin/blog/setup-notice";
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string }>;
}) {
  if (!blogConfig()) return <SetupNotice />;
  const { error, activated } = await searchParams;
  return (
    <section className="blog-panel admin-login">
      <h1>Administrator sign in</h1>
      <p>Use your invited PartSolved administrator account.</p>
      {activated === "1" && <p role="status">Password set. Sign in with your new password.</p>}
      {error && (
        <p role="alert" className="blog-notice">
          Sign in failed or administrator access was not granted.
        </p>
      )}
      <form action="/api/blog/auth" method="post">
        <label>
          Email
          <input
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={200}
          />
        </label>
        <button className="button button-primary" type="submit">
          Sign in
        </button>
      </form>
      <p><Link href="/admin/blog/activate">Accept an invitation or recovery link</Link></p>
      <p>
        If you need access or a password reset, contact the site owner. Public
        account registration is unavailable.
      </p>
    </section>
  );
}
