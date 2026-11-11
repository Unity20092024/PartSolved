import Link from "next/link";
export function SetupNotice() {
  return (
    <section className="blog-panel">
      <h1>Blog setup required</h1>
      <button
        className="button button-primary"
        disabled
        aria-describedby="blog-setup-reason"
      >
        New Article
      </button>
      <p id="blog-setup-reason">
        The publishing dashboard is prepared, but its Supabase connection is not
        configured. Connect the PartSolved project and verify administrator
        access before creating or publishing articles.
      </p>
      <p>
        Connect the shared PartSolved project, apply the reviewed migration, and
        grant an administrator membership before enabling publishing. See{" "}
        <code>docs/blog/README.md</code> in the repository for setup
        instructions. Never send secret keys in chat.
      </p>
      <Link href="/blog">View the public blog</Link>
    </section>
  );
}
