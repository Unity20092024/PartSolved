"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  guideTopics,
  wordCount,
  type Article,
  type ArticleDocument,
  type BlogCategory,
  type BlogMedia,
} from "@/lib/blog/content";
import { blogRequest } from "./client-api";
import { LibraryManager } from "./library-manager";
const RichEditor = dynamic(() => import("./rich-editor"), {
  ssr: false,
  loading: () => <p>Loading article editor…</p>,
});
export function ArticleEditor({
  article,
  categories: initialCategories,
  media: initialMedia,
  enabled,
  scheduling,
}: {
  article: Article;
  categories: BlogCategory[];
  media: BlogMedia[];
  enabled: boolean;
  scheduling: boolean;
}) {
  const [doc, setDoc] = useState(article.document),
    [post, setPost] = useState(article),
    [media, setMedia] = useState(initialMedia),
    [categories, setCategories] = useState(initialCategories),
    [message, setMessage] = useState("All changes saved."),
    [busy, setBusy] = useState(false),
    [locked, setLocked] = useState(false),
    [dirty, setDirty] = useState(false),
    [blocked, setBlocked] = useState(false),
    [saveFailed, setSaveFailed] = useState(false),
    [at, setAt] = useState("");
  const current = useRef(doc),
    version = useRef(article.version),
    saved = useRef(JSON.stringify(doc)),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    conflict = useRef(false),
    mounted = useRef(true);
  const router = useRouter();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const change = (next: ArticleDocument) => {
    current.current = next;
    setDoc(next);
    setSaveFailed(false);
    setDirty(JSON.stringify(next) !== saved.current);
    setMessage("Unsaved changes");
  };
  async function save() {
    if (conflict.current)
      throw new Error(
        "A newer revision exists. Copy or download your text before reloading.",
      );
    const snapshot = current.current,
      serialized = JSON.stringify(snapshot);
    if (serialized === saved.current) return;
    const result = await blogRequest<Article>(`/api/blog/posts/${article.id}`, {
      action: "save",
      version: version.current,
      document: snapshot,
    });
    version.current = result.version;
    saved.current = serialized;
    if (mounted.current) {
      const remainsDirty = JSON.stringify(current.current) !== serialized;
      setPost(result);
      setDirty(remainsDirty);
      setMessage(
        remainsDirty ? "Newer changes are waiting to save." : "Draft saved.",
      );
    }
  }
  function run(action: string) {
    const work = queue.current
      .catch(() => undefined)
      .then(async () => {
        if (conflict.current)
          throw new Error(
            "A newer revision exists. Download your draft, then reload.",
          );
        if (mounted.current) {
          setBusy(true);
          setLocked(action !== "save");
          setMessage(
            action === "save"
              ? "Saving draft…"
              : "Saving and updating article…",
          );
        }
        await save();
        if (action === "preview") {
          router.push(`/admin/blog/${article.id}/preview`);
          return;
        }
        if (action === "save") {
          if (mounted.current)
            setMessage(
              JSON.stringify(current.current) === saved.current
                ? "All changes saved."
                : "Newer changes are waiting to save.",
            );
          return;
        }
        const result = await blogRequest<Article & { deleted?: boolean }>(
          `/api/blog/posts/${article.id}`,
          {
            action,
            version: version.current,
            ...(action === "schedule"
              ? { at: new Date(at).toISOString() }
              : {}),
          },
        );
        if (action === "delete") {
          router.push("/admin/blog");
          return;
        }
        if (action === "duplicate") {
          router.push(`/admin/blog/${result.id}`);
          return;
        }
        version.current = result.version;
        if (mounted.current) {
          setPost(result);
          setMessage(
            action === "publish"
              ? "Article published."
              : action === "schedule"
                ? "Publication scheduled. The job will publish the saved snapshot."
                : "Article unpublished. It is private.",
          );
        }
      })
      .catch((error) => {
        if (mounted.current) setSaveFailed(true);
        if ((error as { status?: number }).status === 409) {
          conflict.current = true;
          if (mounted.current) setBlocked(true);
        }
        if (mounted.current)
          setMessage(
            error instanceof Error
              ? error.message
              : "The action failed. Your text remains in the editor.",
          );
      })
      .finally(() => {
        if (mounted.current) {
          setBusy(false);
          setLocked(false);
        }
      });
    queue.current = work;
    return work;
  }
  // Every write runs through one queue; publish waits for the latest draft save.
  useEffect(() => {
    if (!enabled || !dirty || busy || blocked || saveFailed) return;
    const timer = setTimeout(() => {
      void run("save");
    }, 1500);
    return () => clearTimeout(timer);
  });
  useEffect(() => {
    const leave = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(current.current) !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    const click = (event: MouseEvent) => {
      const anchor = (event.target as Element).closest?.("a[href]");
      if (
        anchor &&
        JSON.stringify(current.current) !== saved.current &&
        !confirm("Leave without saving the latest changes?")
      )
        event.preventDefault();
    };
    window.addEventListener("beforeunload", leave);
    document.addEventListener("click", click, true);
    return () => {
      window.removeEventListener("beforeunload", leave);
      document.removeEventListener("click", click, true);
    };
  }, []);
  const field = (
    key: keyof ArticleDocument,
    label: string,
    limit: number,
    area = false,
  ) => (
    <label>
      {label}
      {area ? (
        <textarea
          value={String(doc[key] || "")}
          maxLength={limit}
          onChange={(e) =>
            change({ ...current.current, [key]: e.target.value })
          }
        />
      ) : (
        <input
          value={String(doc[key] || "")}
          maxLength={limit}
          onChange={(e) =>
            change({ ...current.current, [key]: e.target.value })
          }
        />
      )}
    </label>
  );
  const imageSelect = (
    key: "featured_image_id" | "social_image_id",
    label: string,
  ) => (
    <label>
      {label}
      <select
        value={doc[key] || ""}
        onChange={(e) =>
          change({ ...current.current, [key]: e.target.value || null })
        }
      >
        <option value="">None</option>
        {doc[key] && !media.some((m) => m.id === doc[key]) && (
          <option value={doc[key]!}>
            Existing image (load older images to inspect it)
          </option>
        )}
        {media
          .filter((m) => m.state === "ready")
          .map((m) => (
            <option value={m.id} key={m.id}>
              {m.alt}
            </option>
          ))}
      </select>
    </label>
  );
  return (
    <>
      <Link href="/admin/blog">← Blog dashboard</Link>
      <h1>{doc.title || "New article"}</h1>
      <p className="blog-muted">
        Save draft keeps changes private. Publish explicitly updates the public
        article.
      </p>
      <p>
        Status: {post.status} · Revision {post.version} · {wordCount(doc.body)}{" "}
        words
      </p>
      {post.published_at && (
        <p>First published: {new Date(post.published_at).toLocaleString()}</p>
      )}
      {post.scheduled_at && (
        <p>
          Scheduled: {new Date(post.scheduled_at).toLocaleString()} (your local
          time). Further draft edits do not alter the scheduled snapshot;
          schedule again to update it.
        </p>
      )}
      {post.job_error && (
        <p className="blog-notice">
          Scheduled publication failed. Check the article and reschedule.
        </p>
      )}
      {blocked && (
        <p role="alert" className="blog-notice">
          Another editor saved a newer revision. Your text is retained here.
          Download it before reloading; no further automatic writes will run.
        </p>
      )}
      <fieldset disabled={!enabled || locked || blocked}>
        <div className="admin-fields">
          {field("title", "Article title", 200)}
          {field("slug", "URL slug", 100)}
          {field("author", "Author’s real name", 120)}
          <label>
            Category
            <select
              value={doc.category_id || ""}
              onChange={(e) =>
                change({
                  ...current.current,
                  category_id: e.target.value || null,
                })
              }
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div className="admin-wide">
            {field("excerpt", "Excerpt", 500, true)}
          </div>
          {imageSelect("featured_image_id", "Featured image")}
          {field("featured_alt", "Featured image alt text", 300)}
        </div>
        <h2>Article body</h2>
        <RichEditor
          value={doc.body}
          disabled={!enabled || locked || blocked}
          onChange={(body) => change({ ...current.current, body })}
          media={media}
        />
        <details className="admin-details">
          <summary>Search and sharing settings</summary>
          <div className="admin-fields">
            {field("seo_title", "SEO title (defaults to article title)", 200)}
            {field(
              "meta_description",
              "Meta description (defaults to excerpt)",
              320,
              true,
            )}
            <div className="admin-wide">
              {field(
                "canonical_url",
                "Canonical override (optional; https://www.partsolved.com only)",
                2048,
              )}
            </div>
            {imageSelect("social_image_id", "Social sharing image")}
            {field("social_alt", "Social image alt text", 300)}
          </div>
        </details>
        <details className="admin-details">
          <summary>Related hardware and guides</summary>
          <label>
            Hardware category
            <select
              value={doc.hardware_category}
              onChange={(e) =>
                change({
                  ...current.current,
                  hardware_category: e.target.value,
                })
              }
            >
              <option value="">None</option>
              {[
                "window-hardware",
                "window-parts",
                "door-hardware",
                "door-parts",
                "not-sure",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          {Object.entries(guideTopics).map(([id, label]) => (
            <label className="admin-checkbox" key={id}>
              <input
                type="checkbox"
                checked={doc.related_guides.includes(id)}
                onChange={(e) =>
                  change({
                    ...current.current,
                    related_guides: e.target.checked
                      ? [...current.current.related_guides, id]
                      : current.current.related_guides.filter((g) => g !== id),
                  })
                }
              />
              {label}
            </label>
          ))}
        </details>
      </fieldset>
      <LibraryManager
        categories={categories}
        media={media}
        enabled={enabled && !busy && !blocked && !dirty}
        onMedia={setMedia}
        onCategories={setCategories}
      />
      <details className="admin-details">
        <summary>Scheduling and article actions</summary>
        <p>
          Scheduling uses the configured database publication job. Your selected
          local time is converted to UTC. Monitor failed jobs in the dashboard.
        </p>
        {!scheduling && (
          <p className="blog-notice">
            Scheduling is disabled until the publication job is configured and
            tested.
          </p>
        )}
        <label>
          Publication date and time (your local time)
          <input
            type="datetime-local"
            value={at}
            onChange={(e) => setAt(e.target.value)}
            disabled={!enabled || !scheduling || busy || blocked}
          />
        </label>
        <div className="admin-actions">
          <button
            disabled={!enabled || !scheduling || !at || busy || blocked}
            className="button button-secondary"
            onClick={() => void run("schedule")}
          >
            Schedule article
          </button>
          <button
            disabled={!enabled || busy || blocked}
            className="button button-secondary"
            onClick={() => void run("duplicate")}
          >
            Duplicate article
          </button>
          <button
            disabled={!enabled || busy || blocked}
            className="button button-secondary"
            onClick={() => {
              if (
                confirm(
                  "Unpublish this article and cancel any scheduled publication?",
                )
              )
                void run("unpublish");
            }}
          >
            Unpublish
          </button>
          <button
            disabled={!enabled || busy || blocked}
            className="button button-secondary"
            onClick={() => {
              if (
                confirm(
                  "Permanently delete this article and its published page? Images will remain in the media library.",
                )
              )
                void run("delete");
            }}
          >
            Delete article
          </button>
          <button
            className="button button-secondary"
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(current.current, null, 2)], {
                  type: "application/json",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = "partsolved-draft.json";
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Download draft backup
          </button>
        </div>
      </details>
      <div className="admin-savebar">
        <p role="status" aria-live="polite" className="admin-status">
          {message}
        </p>
        <div className="admin-actions">
          <button
            disabled={!enabled || busy || blocked}
            className="button button-secondary"
            onClick={() => void run("save")}
          >
            Save draft
          </button>
          <button
            disabled={!enabled || busy || blocked}
            className="button button-secondary"
            onClick={() => void run("preview")}
          >
            Preview
          </button>
          <button
            disabled={!enabled || busy || blocked}
            className="button button-primary"
            onClick={() => {
              if (confirm("Publish the latest saved article publicly?"))
                void run("publish");
            }}
          >
            Publish
          </button>
        </div>
      </div>
    </>
  );
}
