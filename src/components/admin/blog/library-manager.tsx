"use client";
import Image from "next/image";
import { useState, type FormEvent } from "react";
import {
  mediaUrl,
  type BlogCategory,
  type BlogMedia,
} from "@/lib/blog/content";
import { blogRequest, compressArticleImage } from "./client-api";
export function LibraryManager({
  categories: initialCategories,
  media: initialMedia,
  enabled,
  onMedia,
  onCategories,
}: {
  categories: BlogCategory[];
  media: BlogMedia[];
  enabled: boolean;
  onMedia?: (media: BlogMedia[]) => void;
  onCategories?: (categories: BlogCategory[]) => void;
}) {
  const [categories, setCategories] = useState(initialCategories),
    [media, setMedia] = useState(initialMedia),
    [hasMore, setHasMore] = useState(initialMedia.length === 200),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const changeMedia = (next: BlogMedia[]) => {
    setMedia(next);
    onMedia?.(next);
  };
  async function action(run: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await run();
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "The action failed.");
    } finally {
      setBusy(false);
    }
  }
  const categorySave = (event: FormEvent<HTMLFormElement>, id?: string) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    void action(async () => {
      const item = await blogRequest<BlogCategory>("/api/blog/categories", {
        ...values,
        id,
      });
      const next = [...categories.filter((c) => c.id !== item.id), item];
      setCategories(next); onCategories?.(next);
    });
  };
  return (
    <section aria-label="Categories and images">
      <p role="status" className="admin-status">
        {message}
      </p>
      <details className="admin-details">
        <summary>Manage categories</summary>
        <p>
          Changes affect category names and URLs across the blog. Used
          categories cannot be deleted. Category choices update in this editor immediately.
        </p>
        {categories.map((c) => (
          <form key={c.id} onSubmit={(e) => categorySave(e, c.id)}>
            <fieldset disabled={!enabled || busy}>
              <div className="admin-fields">
                <label>
                  Name
                  <input
                    name="name"
                    defaultValue={c.name}
                    required
                    maxLength={100}
                  />
                </label>
                <label>
                  URL slug
                  <input
                    name="slug"
                    defaultValue={c.slug}
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={100}
                  />
                </label>
                <label className="admin-wide">
                  Description
                  <textarea
                    name="description"
                    defaultValue={c.description}
                    maxLength={500}
                  />
                </label>
              </div>
              <div className="admin-actions">
                <button className="button button-secondary">
                  Save category
                </button>
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={() => {
                    if (
                      confirm(
                        `Delete category “${c.name}”? Articles using it must be reassigned first.`,
                      )
                    )
                      void action(async () => {
                        await blogRequest("/api/blog/categories", {
                          action: "delete",
                          id: c.id,
                        });
                        const next = categories.filter((v) => v.id !== c.id);
                        setCategories(next); onCategories?.(next);
                      });
                  }}
                >
                  Delete category
                </button>
              </div>
            </fieldset>
          </form>
        ))}
        <form onSubmit={categorySave}>
          <fieldset disabled={!enabled || busy}>
            <h3>Add category</h3>
            <label>
              Name
              <input name="name" required maxLength={100} />
            </label>
            <label>
              URL slug
              <input
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                maxLength={100}
              />
            </label>
            <label>
              Description
              <textarea name="description" maxLength={500} />
            </label>
            <button className="button button-primary">Add category</button>
          </fieldset>
        </form>
      </details>
      <details className="admin-details">
        <summary>Upload and manage images</summary>
        <p>
          JPEG, PNG or WebP, up to 10 MiB before browser compression. Images are
          resized to 1600 pixels and re-encoded on the server. Images used by
          drafts, schedules or published articles cannot be deleted. The newest
          200 images are shown first; load older images below.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget,
              data = new FormData(form),
              file = data.get("image"),
              alt = String(data.get("alt") || "");
            void action(async () => {
              if (!(file instanceof File) || !file.size)
                throw new Error("Choose an image.");
              const image = await compressArticleImage(file);
              const response = await fetch("/api/blog/media", {
                method: "POST",
                headers: {
                  "Content-Type": image.type,
                  "x-image-alt": encodeURIComponent(alt),
                },
                body: image,
              });
              const item = await response.json();
              if (!response.ok) throw new Error(item.error);
              changeMedia([item, ...media]);
              form.reset();
            });
          }}
        >
          <fieldset disabled={!enabled || busy}>
            <label>
              Image
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <label>
              Describe the image for accessibility
              <input name="alt" required maxLength={300} />
            </label>
            <button className="button button-primary">Upload image</button>
          </fieldset>
        </form>
        <div className="admin-media">
          {media.map((item) => (
            <article key={item.id}>
              {item.state === "ready" ? (
                <Image
                  src={mediaUrl(item.id)}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  unoptimized
                />
              ) : (
                <p>
                  Incomplete image: {item.state}. Remove this entry before
                  retrying the upload.
                </p>
              )}
              <p>
                {item.width} × {item.height} · {Math.ceil(item.bytes / 1024)}{" "}
                KiB
              </p>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const alt = String(
                    new FormData(event.currentTarget).get("alt") || "",
                  );
                  void action(async () => {
                    const changed = await blogRequest<BlogMedia>(
                      `/api/blog/media/${item.id}`,
                      { alt },
                    );
                    changeMedia(
                      media.map((m) => (m.id === item.id ? changed : m)),
                    );
                  });
                }}
              >
                <label>
                  Alt text
                  <input
                    name="alt"
                    defaultValue={item.alt}
                    maxLength={300}
                    required
                  />
                </label>
                <button
                  disabled={!enabled || busy}
                  className="button button-secondary"
                >
                  Update alt text
                </button>
              </form>
              <button
                disabled={!enabled || busy}
                className="button button-secondary"
                onClick={() => {
                  if (confirm("Delete this unused image permanently?"))
                    void action(async () => {
                      await blogRequest(`/api/blog/media/${item.id}`, {
                        action: "delete",
                      });
                      changeMedia(media.filter((m) => m.id !== item.id));
                    });
                }}
              >
                Delete image
              </button>
            </article>
          ))}
        </div>
        {hasMore && (
          <button
            className="button button-secondary"
            disabled={busy}
            onClick={() =>
              void action(async () => {
                const response = await fetch(
                  `/api/blog/media?offset=${media.length}`,
                  { signal: AbortSignal.timeout(20_000) },
                );
                const rows = await response.json();
                if (!response.ok) throw new Error(rows.error);
                const next = rows as BlogMedia[];
                setHasMore(next.length === 200);
                changeMedia([
                  ...media,
                  ...next.filter(
                    (item) => !media.some((old) => old.id === item.id),
                  ),
                ]);
              })
            }
          >
            Load older images
          </button>
        )}
      </details>
    </section>
  );
}
