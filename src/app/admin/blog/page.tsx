import Link from "next/link";
import { adminPage } from "@/lib/blog/admin-page";
import {
  writesEnabled,
  databaseError,
  adminCollections,
} from "@/lib/blog/server";
import { SetupNotice } from "@/components/admin/blog/setup-notice";
import { CreateButton } from "@/components/admin/blog/create-button";
import { LibraryManager } from "@/components/admin/blog/library-manager";
import type { Article } from "@/lib/blog/content";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const access = await adminPage();
  if (!access) return <SetupNotice />;
  const { client } = access,
    params = await searchParams,
    page = Math.max(1, Math.floor(Number(params.page) || 1)),
    q = (params.q || "").slice(0, 100).replace(/[%_\\]/g, ""),
    status = ["draft", "scheduled", "published"].includes(params.status || "")
      ? params.status
      : "";
  let query = client
    .from("blog_posts")
    .select("*", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range((page - 1) * 30, page * 30 - 1);
  if (q) query = query.ilike("document->>title", `%${q}%`);
  if (status) query = query.eq("status", status);
  const [posts, live, drafts, scheduled, collections] = await Promise.all([
    query,
    client
      .from("blog_publications")
      .select("post_id", { count: "exact", head: true }),
    client
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "draft"),
    client
      .from("blog_posts")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled"),
    adminCollections(),
  ]);
  [posts.error, live.error, drafts.error, scheduled.error].forEach(
    databaseError,
  );
  const enabled = writesEnabled();
  return (
    <>
      <div className="admin-heading">
        <h1>Blog publishing</h1>
        <form action="/api/blog/auth" method="post">
          <input type="hidden" name="action" value="logout" />
          <button className="button button-secondary">Sign out</button>
        </form>
      </div>
      <p>
        Published: {live.count} · Drafts: {drafts.count} · Scheduled:{" "}
        {scheduled.count}
      </p>
      <p className="blog-muted">
        Published counts reflect live snapshots; an existing live article may
        also have a scheduled update.
      </p>
      {!enabled && (
        <p className="blog-notice">
          Writes are disabled until database setup and access checks are
          verified.
        </p>
      )}
      <CreateButton enabled={enabled} />
      <form className="admin-filter" method="get">
        <label>
          Search articles
          <input name="q" defaultValue={q} />
        </label>
        <label>
          Status
          <select name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="scheduled">Scheduled</option>
          </select>
        </label>
        <button className="button button-secondary">Filter</button>
      </form>
      <div className="admin-posts">
        {(posts.data as Article[]).map((post) => (
          <article className="blog-panel" key={post.id}>
            <h2>
              <Link href={`/admin/blog/${post.id}`}>
                {post.document.title || "Untitled draft"}
              </Link>
            </h2>
            <p>
              {post.status} · Updated{" "}
              {new Date(post.updated_at).toLocaleString("en-US", {
                timeZone: "UTC",
              })}{" "}
              UTC
            </p>
            {post.scheduled_at && (
              <p>
                Scheduled:{" "}
                {new Date(post.scheduled_at).toLocaleString("en-US", {
                  timeZone: "UTC",
                })}{" "}
                UTC
              </p>
            )}
            {post.job_error && (
              <p role="alert">
                Publication job failed. Review the document, images and URL,
                then reschedule. The job will retry.
              </p>
            )}
          </article>
        ))}
      </div>
      {!posts.data?.length && <p>No articles match this filter.</p>}
      <nav className="blog-pagination" aria-label="Dashboard pages">
        {page > 1 && (
          <Link
            href={`?page=${page - 1}&q=${encodeURIComponent(q)}&status=${status}`}
          >
            Previous
          </Link>
        )}
        {page * 30 < (posts.count || 0) && (
          <Link
            href={`?page=${page + 1}&q=${encodeURIComponent(q)}&status=${status}`}
          >
            Next
          </Link>
        )}
      </nav>
      <LibraryManager {...collections} enabled={enabled} />
    </>
  );
}
