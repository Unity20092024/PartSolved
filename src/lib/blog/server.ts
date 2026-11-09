import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";
import { SITE_ORIGIN } from "@/config/site";
import type { Article, Publication, BlogCategory, BlogMedia } from "./content";
export class BlogError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function blogConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  let anonymous = !!key?.startsWith("sb_publishable_");
  // Never let a misplaced service-role key bypass RLS in public article/media reads.
  if (key && !anonymous) {
    try { anonymous = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "anon"; } catch { anonymous = false; }
  }
  return url && key && anonymous && url.startsWith("https://") ? { url, key } : null;
}
export const writesEnabled = () =>
  process.env.BLOG_WRITES_ENABLED === "true" &&
  !!blogConfig() &&
  !!process.env.SUPABASE_SECRET_KEY;
export const schedulerReady = () => process.env.BLOG_SCHEDULER_READY === "true";
const uncachedFetch: typeof fetch = (input, init) =>
  fetch(input, {
    ...init,
    cache: "no-store",
    signal: init?.signal
      ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)])
      : AbortSignal.timeout(15_000),
  });
export function publicBlogClient() {
  const config = blogConfig();
  return config
    ? createClient(config.url, config.key, {
        auth: { persistSession: false, autoRefreshToken: false },
        global: { fetch: uncachedFetch },
      })
    : null;
}
export function serviceBlogClient() {
  const config = blogConfig(),
    secret = process.env.SUPABASE_SECRET_KEY;
  if (!config || !secret)
    throw new BlogError("Blog image storage is not configured.", 503);
  return createClient(config.url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: uncachedFetch },
  });
}
export async function sessionBlogClient() {
  const config = blogConfig();
  if (!config)
    throw new BlogError(
      "Connect the blog's Supabase project before signing in or publishing.",
      503,
    );
  const store = await cookies();
  return createServerClient(config.url, config.key, {
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure: (process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN).startsWith(
        "https:",
      ),
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        try {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        } catch {
          /* Proxy refreshes cookies before server rendering. */
        }
      },
    },
    global: { fetch: uncachedFetch },
  });
}
export async function requireBlogAdmin() {
  const client = await sessionBlogClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) throw new BlogError("Sign in to manage articles.", 401);
  const { data: allowed, error: membership } =
    await client.rpc("blog_is_admin");
  if (membership || allowed !== true)
    throw new BlogError("Administrator access is required.", 403);
  return { client, user };
}
export function assertBlogOrigin(request: Request) {
  const expected = process.env.BLOG_ADMIN_ORIGIN || SITE_ORIGIN;
  const host = request.headers.get("host") || new URL(request.url).host;
  if (
    request.headers.get("origin") !== expected ||
    new URL(expected).host !== host ||
    ![null, "same-origin"].includes(request.headers.get("sec-fetch-site"))
  )
    throw new BlogError("This request must come from the blog dashboard.", 403);
}
export function requireBlogWrites() {
  if (!writesEnabled())
    throw new BlogError(
      "Publishing writes are disabled until database setup is approved and verified.",
      503,
    );
}
export function databaseError(error: { code?: string } | null) {
  if (!error) return;
  if (["40001", "23505", "23503"].includes(error.code || ""))
    throw new BlogError(
      error.code === "40001"
        ? "This article changed elsewhere. Your unsaved text is retained; reload before making more changes."
        : "That URL/category/image is already used or referenced. Review your changes.",
      error.code === "40001" ? 409 : 422,
    );
  if (error.code === "42501")
    throw new BlogError("Administrator access is required.", 403);
  throw new BlogError(
    "The database could not complete this action. Review the fields or retry later.",
    400,
  );
}
export const getPublication = cache(
  async (
    slug: string,
  ): Promise<{ article: Publication; redirect: boolean } | null> => {
    const client = publicBlogClient();
    if (!client) return null;
    const { data, error } = await client
      .from("blog_publications")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();
    if (error)
      throw new BlogError("Articles are temporarily unavailable.", 503);
    if (data) return { article: data as Publication, redirect: false };
    const { data: history } = await client
      .from("blog_slug_history")
      .select("post_id")
      .eq("slug", slug)
      .maybeSingle();
    if (!history) return null;
    const { data: current } = await client
      .from("blog_publications")
      .select("*")
      .eq("post_id", history.post_id)
      .maybeSingle();
    return current ? { article: current as Publication, redirect: true } : null;
  },
);
export async function listPublications(categoryId?: string, page = 1) {
  const client = publicBlogClient();
  if (!client)
    return { articles: [] as Publication[], count: 0, unavailable: true };
  let query = client
    .from("blog_publications")
    .select("*", { count: "exact" })
    .order("published_at", { ascending: false })
    .range((page - 1) * 12, page * 12 - 1);
  if (categoryId) query = query.eq("category_id", categoryId);
  const { data, count, error } = await query;
  return {
    articles: (data ?? []) as Publication[],
    count: count ?? 0,
    unavailable: !!error,
  };
}
export async function publicCategories(): Promise<BlogCategory[]> {
  const client = publicBlogClient();
  if (!client) return [];
  const { data, error } = await client
    .from("blog_categories")
    .select("*")
    .order("name");
  if (error)
    throw new BlogError("Categories are temporarily unavailable.", 503);
  return data as BlogCategory[];
}
export async function sitemapPublications(): Promise<Publication[]> {
  const client = publicBlogClient();
  if (!client) return [];
  const rows: Publication[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await client
      .from("blog_publications")
      .select("*")
      .order("post_id")
      .range(start, start + 999);
    if (error) throw new BlogError("Sitemap publication query failed.", 503);
    rows.push(...(data as Publication[]));
    if (data.length < 1000) return rows;
    if (rows.length >= 49000)
      throw new BlogError(
        "Sitemap requires sharding before adding more articles.",
        503,
      );
  }
}
export async function adminArticle(id: string): Promise<Article | null> {
  const { client } = await requireBlogAdmin();
  const { data, error } = await client
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  databaseError(error);
  return data as Article | null;
}
export async function adminCollections() {
  const { client } = await requireBlogAdmin();
  const [categories, media] = await Promise.all([
    client.from("blog_categories").select("*").order("name"),
    client
      .from("blog_media")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(200),
  ]);
  databaseError(categories.error);
  databaseError(media.error);
  return {
    categories: categories.data as BlogCategory[],
    media: media.data as BlogMedia[],
  };
}
